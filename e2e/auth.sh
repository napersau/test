#!/usr/bin/env bash
# Kịch bản kiểm thử end-to-end auth-service qua API Gateway
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.." || exit 1
G=http://localhost:8080
J='Content-Type: application/json'

jget() { python -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
show() {
  python -c "
import sys,json
d=json.load(sys.stdin)
extra='' if d.get('data') is None else ' | '+str(d.get('data'))[:150]
print('   ', d.get('status'), d.get('errorCode') or '', '|', d.get('message'), extra)"
}
post() { # $1=path $2=body $3=token(optional)
  if [ -n "$3" ]; then
    curl -s -X POST "$G$1" -H "$J" -H "Authorization: Bearer $3" -d "$2"
  else
    curl -s -X POST "$G$1" -H "$J" -d "$2"
  fi
}
getauth() { curl -s "$G$1" -H "Authorization: Bearer $2"; }

echo "== A. LOGIN / REFRESH / LOGOUT =="
R=$(post /api/v1/auth/login '{"username":"admin","password":"Admin@123"}')
AT=$(echo "$R" | jget "['data']['accessToken']"); RT=$(echo "$R" | jget "['data']['refreshToken']")
echo "1. login admin:"
echo "$R" | python -c "import sys,json; d=json.load(sys.stdin); x=d['data']; print('   ',d['status'],'| user=',x['user']['username'],x['user']['role'],'| expiresIn=',x['expiresIn'])"
echo "2. GET /me qua Gateway:"
getauth /api/v1/auth/me "$AT" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print('    id=',d['id'],'role=',d['role'],'status=',d['status'])"
echo "3. sai mat khau:"; post /api/v1/auth/login '{"username":"admin","password":"Sai@12345"}' | show
echo "4. thieu field:"; post /api/v1/auth/login '{"username":""}' | show
R2=$(post /api/v1/auth/refresh "{\"refreshToken\":\"$RT\"}")
RT2=$(echo "$R2" | jget "['data']['refreshToken']"); AT2=$(echo "$R2" | jget "['data']['accessToken']")
echo "5. refresh (xoay vong):"; echo "$R2" | show
echo "   token moi khac cu: $([ "$RT" != "$RT2" ] && echo yes || echo NO); access moi dung duoc: HTTP $(curl -s -o /dev/null -w '%{http_code}' $G/api/v1/auth/me -H "Authorization: Bearer $AT2")"
echo "6. dung LAI refresh token cu (gia lap danh cap):"; post /api/v1/auth/refresh "{\"refreshToken\":\"$RT\"}" | show
echo "7. refresh token MOI cung bi thu hoi theo (force logout moi thiet bi):"; post /api/v1/auth/refresh "{\"refreshToken\":\"$RT2\"}" | show
R3=$(post /api/v1/auth/login '{"username":"admin","password":"Admin@123"}'); RT3=$(echo "$R3" | jget "['data']['refreshToken']")
echo "8. logout, logout lan 2 (idempotent), refresh sau logout:"
post /api/v1/auth/logout "{\"refreshToken\":\"$RT3\"}" | show
post /api/v1/auth/logout "{\"refreshToken\":\"$RT3\"}" | show
post /api/v1/auth/refresh "{\"refreshToken\":\"$RT3\"}" | show

echo; echo "== B. QUAN LY TAI KHOAN =="
R=$(post /api/v1/auth/login '{"username":"admin","password":"Admin@123"}'); AT=$(echo "$R" | jget "['data']['accessToken']")
echo "9. admin tao bac si (phong p01 -> P01):"
post /api/v1/auth/users '{"username":"bs.nguyen","password":"BacSi@123","fullName":"BS Nguyen Van A","phoneNumber":"0911111111","roomNumber":"p01","roleCode":"VETERINARIAN"}' "$AT" \
  | python -c "import sys,json; d=json.load(sys.stdin); x=d.get('data') or {}; print('   ',d['status'],d.get('errorCode') or '',d['message'],'| room=',x.get('roomNumber'),'role=',x.get('role'))"
echo "10. trung SDT:"; post /api/v1/auth/users '{"username":"khac","password":"BacSi@123","fullName":"X","phoneNumber":"0911111111","roleCode":"VETERINARIAN"}' "$AT" | show
echo "11. trung so phong:"; post /api/v1/auth/users '{"username":"bs.tran","password":"BacSi@123","fullName":"BS Tran","phoneNumber":"0922222222","roomNumber":"P01","roleCode":"VETERINARIAN"}' "$AT" | show
echo "12. mat khau yeu / SDT sai dinh dang:"; post /api/v1/auth/users '{"password":"123","fullName":"X","phoneNumber":"12345","roleCode":"RECEPTIONIST"}' "$AT" | show
echo "13. admin tao le tan:"; post /api/v1/auth/users '{"username":"letan1","password":"LeTan@123","fullName":"Le Tan 1","phoneNumber":"0933333333","roleCode":"RECEPTIONIST"}' "$AT" | show
BAT=$(post /api/v1/auth/login '{"username":"bs.nguyen","password":"BacSi@123"}' | jget "['data']['accessToken']")
echo "14. bac si liet ke user (phai 403):"; getauth /api/v1/auth/users "$BAT" | show
LAT=$(post /api/v1/auth/login '{"username":"letan1","password":"LeTan@123"}' | jget "['data']['accessToken']")
echo "15. le tan tao chu nuoi (username mac dinh = SDT):"
post /api/v1/auth/users '{"password":"ChuNuoi@1","fullName":"Chu Nuoi A","phoneNumber":"0944444444","roleCode":"PET_OWNER"}' "$LAT" \
  | python -c "import sys,json; d=json.load(sys.stdin); x=d.get('data') or {}; print('   ',d['status'],d.get('errorCode') or '',d['message'],'| username=',x.get('username'))"
echo "16. le tan thu tao bac si (phai 403):"; post /api/v1/auth/users '{"username":"hack","password":"BacSi@123","fullName":"X","phoneNumber":"0955555555","roleCode":"VETERINARIAN"}' "$LAT" | show
echo "17. le tan tim khach theo SDT (ep loc PET_OWNER):"
getauth "/api/v1/auth/users?keyword=0944" "$LAT" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print('    tim 0944 -> tong=',d['totalElements'],[(i['username'],i['role']) for i in d['items']])"
getauth "/api/v1/auth/users?keyword=0911" "$LAT" | python -c "import sys,json; d=json.load(sys.stdin)['data']; print('    tim SDT cua bac si -> tong=',d['totalElements'],'(phai 0)')"
echo "18. admin tu khoa minh (phai bi chan):"; post /api/v1/auth/users/1/status '{"status":"LOCKED"}' "$AT" | show
BSID=$(getauth "/api/v1/auth/users?keyword=bs.nguyen" "$AT" | jget "['data']['items'][0]['id']")
BRT=$(post /api/v1/auth/login '{"username":"bs.nguyen","password":"BacSi@123"}' | jget "['data']['refreshToken']")
echo "19. admin khoa bac si -> dang nhap bi tu choi, refresh token cu bi thu hoi:"
post /api/v1/auth/users/$BSID/status '{"status":"LOCKED"}' "$AT" | show
post /api/v1/auth/login '{"username":"bs.nguyen","password":"BacSi@123"}' | show
post /api/v1/auth/refresh "{\"refreshToken\":\"$BRT\"}" | show
echo "   me() voi access token cu cua bac si da bi khoa:"; getauth /api/v1/auth/me "$BAT" | show
LRT=$(post /api/v1/auth/login '{"username":"letan1","password":"LeTan@123"}' | jget "['data']['refreshToken']")
echo "20. doi mat khau le tan (sai mat khau hien tai, dung), roi refresh phien cu, dang nhap mat khau moi:"
post /api/v1/auth/change-password '{"currentPassword":"sai-mk-123","newPassword":"MoiLeTan@1"}' "$LAT" | show
post /api/v1/auth/change-password '{"currentPassword":"LeTan@123","newPassword":"MoiLeTan@1"}' "$LAT" | show
post /api/v1/auth/refresh "{\"refreshToken\":\"$LRT\"}" | show
post /api/v1/auth/login '{"username":"letan1","password":"MoiLeTan@1"}' | show

echo; echo "== C. CHAN DO MAT KHAU (username rieng 'nobody', khong dung admin) =="
for i in 1 2 3 4 5 6; do
  printf "   lan $i: "
  post /api/v1/auth/login '{"username":"nobody","password":"Sai@12345"}' | python -c "import sys,json; d=json.load(sys.stdin); print(d['status'],d['errorCode'])"
done

echo; echo "== D. ENDPOINT NOI BO =="
echo "   qua Gateway (phai khong toi duoc): HTTP $(curl -s -o /dev/null -w '%{http_code}' $G/internal/auth/doctors/active-count -H "Authorization: Bearer $AT")"
echo "   trong mang Docker, khong header:"
docker compose exec -T api-gateway curl -s http://auth-service:8081/internal/auth/doctors/active-count; echo
docker compose exec -T api-gateway curl -s "http://auth-service:8081/internal/auth/users?ids=1,$BSID" \
  | python -c "import sys,json; print('   ',[(u['fullName'],u['role'],u['roomNumber']) for u in json.load(sys.stdin)['data']])"
