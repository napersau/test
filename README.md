
# 1. Xóa container, volume (DB + ảnh), image do compose build, container mồ côi
docker compose down -v --rmi local --remove-orphans

# 2. (Tùy chọn) dọn image <none> cũ và cache build để build thật sự từ đầu
docker image prune -f
<br/>
docker builder prune -af

# 3. Build lại không dùng cache rồi chạy
<br/>
docker compose build --no-cache
<br/>
docker compose up -d
<br/>
docker compose ps 