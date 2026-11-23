# Test-only self-signed certificate for localhost, generated with:
#   openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \n#     -keyout localhost-key.pem -out localhost-cert.pem -days 36500 \n#     -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
