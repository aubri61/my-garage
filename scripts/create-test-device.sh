#!/bin/sh
# Offline portfolio fixtures only. Never use these keys with a real vehicle.
set -eu
umask 077
if [ "$#" -ne 3 ]; then
  echo 'Usage: sh scripts/create-test-device.sh OUTPUT_DIRECTORY ACCOUNT_EMAIL DEVICE_ID' >&2
  exit 1
fi
out=$1
email=$2
device=$3
# OpenSSL config injection and path traversal in names are not accepted.
case "$email" in *[!a-zA-Z0-9@._+-]*|'') echo 'Invalid email' >&2; exit 1;; esac
case "$device" in *[!a-zA-Z0-9_-]*|'') echo 'Invalid device ID' >&2; exit 1;; esac
mkdir -p "$out"
if [ ! -f "$out/ca.pem" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$out/ca-key.pem" -out "$out/ca.pem" -days 3650 -subj '/CN=My Garage Offline Test CA' -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' 2>/dev/null
fi
if [ -f "$out/$device-key.pem" ] || [ -f "$out/$device-cert.pem" ]; then
  echo 'Device files already exist; choose a new device ID' >&2; exit 1
fi
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$out/$device-key.pem" 2>/dev/null
openssl req -new -key "$out/$device-key.pem" -out "$out/$device.csr" -subj "/CN=$device"
cat > "$out/$device.ext" <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=clientAuth
subjectAltName=email:$email,URI:urn:my-garage:device:$device
EXT
openssl x509 -req -in "$out/$device.csr" -CA "$out/ca.pem" -CAkey "$out/ca-key.pem" -CAcreateserial -out "$out/$device-cert.pem" -days 365 -sha256 -extfile "$out/$device.ext" 2>/dev/null
rm "$out/$device.csr" "$out/$device.ext"
echo "Created offline fixtures in $out. Keep private keys local; configure the server with ca.pem only."
