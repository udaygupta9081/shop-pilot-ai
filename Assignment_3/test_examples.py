import xml.etree.ElementTree as ET

SOAP = "http://schemas.xmlsoap.org/soap/envelope/"
MB = "http://sms.msgbridge.example/schema/v1"

# Check successful response.
root = ET.parse("soap-response.xml").getroot()
body = root.find(f"{{{SOAP}}}Body")
response = body.find(f"{{{MB}}}SendSmsResponse") if body is not None else None

assert response is not None, "SendSmsResponse is missing"

for field in ["messageId", "clientRef", "status", "segments", "acceptedAt"]:
    assert response.find(f"{{{MB}}}{field}") is not None, f"Missing {field}"

assert response.findtext(f"{{{MB}}}status") == "ACCEPTED"
print("Success response structure: PASS")

# Check SOAP fault.
root = ET.parse("soap-fault.xml").getroot()
body = root.find(f"{{{SOAP}}}Body")
fault = body.find(f"{{{SOAP}}}Fault") if body is not None else None

assert fault is not None, "SOAP Fault is missing"
detail = fault.find("detail")
error = detail.find(f"{{{MB}}}SmsFault") if detail is not None else None

assert error is not None, "SmsFault detail is missing"
assert error.findtext(f"{{{MB}}}code") == "invalid_recipient"
assert error.findtext(f"{{{MB}}}reason") == "DND_REGISTERED"
assert error.findtext(f"{{{MB}}}retryable") == "false"

print("SOAP fault structure: PASS")
