from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import uuid

SOAP = "http://schemas.xmlsoap.org/soap/envelope/"
MB = "http://sms.msgbridge.example/schema/v1"

ET.register_namespace("soap", SOAP)
ET.register_namespace("mb", MB)


def make_envelope():
    envelope = ET.Element(f"{{{SOAP}}}Envelope")
    body = ET.SubElement(envelope, f"{{{SOAP}}}Body")
    return envelope, body


def make_success(client_ref):
    envelope, body = make_envelope()
    result = ET.SubElement(body, f"{{{MB}}}SendSmsResponse")

    fields = {
        "messageId": "MBMSG-" + uuid.uuid4().hex[:8].upper(),
        "clientRef": client_ref,
        "status": "ACCEPTED",
        "segments": "1",
        "acceptedAt": datetime.now(timezone.utc).isoformat(),
    }

    for name, value in fields.items():
        ET.SubElement(result, f"{{{MB}}}{name}").text = value

    return envelope


def make_fault():
    envelope, body = make_envelope()
    fault = ET.SubElement(body, f"{{{SOAP}}}Fault")

    ET.SubElement(fault, "faultcode").text = "soap:Client"
    ET.SubElement(fault, "faultstring").text = (
        "Recipient cannot receive this message"
    )
    ET.SubElement(fault, "faultactor").text = (
        "http://127.0.0.1:8000/soap/v1/sms"
    )

    detail = ET.SubElement(fault, "detail")
    error = ET.SubElement(detail, f"{{{MB}}}SmsFault")

    for name, value in {
        "code": "invalid_recipient",
        "reason": "DND_REGISTERED",
        "retryable": "false",
        "gatewayRef": "MBERR-4410873",
    }.items():
        ET.SubElement(error, f"{{{MB}}}{name}").text = value

    return envelope


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/soap/v1/sms":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            root = ET.fromstring(self.rfile.read(length))

            body = root.find(f"{{{SOAP}}}Body")
            if body is None:
                raise ValueError("Missing SOAP Body")

            request = body.find(f"{{{MB}}}SendSmsRequest")
            if request is None:
                raise ValueError("Missing SendSmsRequest")

            client_ref = request.findtext(f"{{{MB}}}clientRef", "")
            recipient = request.findtext(f"{{{MB}}}recipient", "")

            if not recipient:
                raise ValueError("Recipient is required")

            # Use FAULT in clientRef to simulate a gateway rejection.
            if client_ref.startswith("FAULT"):
                result = make_fault()
                status = 500
            else:
                result = make_success(client_ref)
                status = 200

            data = ET.tostring(
                result, encoding="utf-8", xml_declaration=True
            )

            self.send_response(status)
            self.send_header("Content-Type", "text/xml; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        except (ET.ParseError, ValueError) as exc:
            self.send_error(400, str(exc))

    def log_message(self, fmt, *args):
        print(fmt % args)


if __name__ == "__main__":
    print("Mock SOAP server: http://127.0.0.1:8000/soap/v1/sms")
    print("Press Ctrl+C to stop.")
    HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
