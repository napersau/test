#!/usr/bin/env bash
# Chạy toàn bộ kịch bản end-to-end theo thứ tự, in số kiểm tra đạt / không đạt của từng kịch bản.
# Yêu cầu: `docker compose up -d` đã chạy xong và mọi container healthy; file .env đã có; Python 3 + thư viện `websockets`
# (pip install websockets) cho notification.py.
# CẢNH BÁO: mỗi kịch bản XÓA dữ liệu nghiệp vụ hiện có (người dùng khác admin, thú cưng, lịch hẹn, đợt khám, hóa đơn...).
cd "$(dirname "$0")/.." || exit 1
export PYTHONIOENCODING=utf-8
summary=()

run() { # tên lệnh...
  local name=$1; shift
  local out; out=$("$@" 2>&1)
  echo "$out" | grep -F "[FAIL]"
  local line; line=$(echo "$out" | grep "KET QUA" | tail -1)
  summary+=("$name: ${line:-(không có dòng KET QUA, chạy riêng để xem chi tiết)}")
}

run appointment bash e2e/appointment.sh
run clinical bash e2e/clinical.sh
run billing bash e2e/billing.sh
run notification python e2e/notification.py
# features.py cần appointment-service chạy với cron quét nhanh (xem e2e/README.md); bật bằng RUN_FEATURES=1
if [ "$RUN_FEATURES" = "1" ]; then run features python e2e/features.py; fi

echo
echo "===== TỔNG KẾT ====="
printf '%s\n' "${summary[@]}"
