import xml.etree.ElementTree as ET
from pathlib import Path

base = Path(__file__).parent
wsdl_path = base / "partner.wsdl"

WSDL = "http://schemas.xmlsoap.org/wsdl/"
SOAP = "http://schemas.xmlsoap.org/wsdl/soap/"
XSD = "http://www.w3.org/2001/XMLSchema"

root = ET.parse(wsdl_path).getroot()
ns = {"w": WSDL, "soap": SOAP, "xsd": XSD}

assert root.tag == f"{{{WSDL}}}definitions", "Invalid WSDL root"
assert root.find("w:service", ns) is not None, "Missing service"
assert root.find("w:portType", ns) is not None, "Missing portType"
assert root.find("w:binding", ns) is not None, "Missing binding"

operations = [
    item.get("name")
    for item in root.findall(".//w:portType/w:operation", ns)
]
assert "SendSms" in operations, "SendSms operation missing"

service = root.find("w:service", ns)
port = service.find("w:port", ns)
address = port.find("soap:address", ns)

print("WSDL XML: PASS")
print("Service:", service.get("name"))
print("Port type:", root.find("w:portType", ns).get("name"))
print("Binding:", root.find("w:binding", ns).get("name"))
print("Operations:", operations)
print("Endpoint:", address.get("location") if address is not None else "Missing")

# Check the XML documents independently.
for filename in [
    "soap-request.xml",
    "soap-response.xml",
    "soap-fault.xml",
]:
    ET.parse(base / filename)
    print(f"{filename}: XML PASS")

print("Basic contract checks completed.")
