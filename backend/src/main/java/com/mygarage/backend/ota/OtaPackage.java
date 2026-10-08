package com.mygarage.backend.ota;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public record OtaPackage(Metadata metadata, String signature, byte[] fileBytes) {
    public OtaPackage {
        fileBytes = fileBytes == null ? null : fileBytes.clone();
    }

    @Override
    public byte[] fileBytes() {
        return fileBytes == null ? null : fileBytes.clone();
    }

    public record Metadata(String updateId, String manufacturer, String model, String hardwareId,
            String component, String version, long securityVersion, String fileHash, String signerKeyId) {
        // Protocol v1: fixed field order, UTF-8 strings prefixed by 32-bit big-endian byte lengths,
        // securityVersion as a signed 64-bit big-endian integer. All policy fields are signed.
        public byte[] signingBytes() {
            try {
                var bytes = new ByteArrayOutputStream();
                var output = new DataOutputStream(bytes);
                for (String value : new String[] {"MY_GARAGE_OTA_METADATA_V1", updateId, manufacturer,
                        model, hardwareId, component, version}) {
                    writeString(output, value);
                }
                output.writeLong(securityVersion);
                writeString(output, fileHash);
                writeString(output, signerKeyId);
                output.flush();
                return bytes.toByteArray();
            } catch (IOException exception) {
                throw new IllegalStateException("메모리 메타데이터 인코딩 실패", exception);
            }
        }

        private static void writeString(DataOutputStream output, String value) throws IOException {
            byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
            output.writeInt(bytes.length);
            output.write(bytes);
        }
    }
}
