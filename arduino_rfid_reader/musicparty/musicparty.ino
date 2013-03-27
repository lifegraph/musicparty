#include <WiFlyHQ.h>
#include <sm130.h>
#include <SoftwareSerial.h>

NFCReader rfid(7, 8);
SoftwareSerial wifiSerial(2,3);

WiFly wifly;

/* Change these to match your WiFi network */
const char mySSID[] = "OLIN_GUEST";
const char myPassword[] = "The_Phoenix_Flies";

const char host[] = "http://musicparty.herokuapp.com";

// The number of seconds to wait before accepting another tag
const uint8_t TIME_DELAY = 2;
// Var to keep track of time between tags
long lastReadTime = 0;

char deviceId[] = "test-party";
char endpoint[] = "/tap";

void setup()
{
    char buf[32];
    
    Serial.begin(9600);

    Serial.println("Starting");

    wifiSerial.begin(9600);
    if (!wifly.begin(&wifiSerial, &Serial)) {
        Serial.println("Failed to start wifly");
    }

    /* Join wifi network if not already associated */
    if (!wifly.isAssociated()) {
    /* Setup the WiFly to connect to a wifi network */
    Serial.println("Joining network");
    wifly.setSSID(mySSID);
    wifly.setPassphrase(myPassword);
    wifly.enableDHCP();

    if (wifly.join()) {
        Serial.println("Joined wifi network");
    } else {
        Serial.println("Failed to join wifi network");
    }
    } else {
        Serial.println("Already joined network");
    }


    Serial.print("MAC: ");
    Serial.println(wifly.getMAC(buf, sizeof(buf)));
    Serial.print("IP: ");
    Serial.println(wifly.getIP(buf, sizeof(buf)));

    if (wifly.isConnected()) {
        Serial.println("Old connection active. Closing");
        wifly.close();
    }
    
    if (wifly.open(host, 80)) {
        Serial.print("Connected to ");
	Serial.println(host);

	/* Send the request */
	wifly.println("GET / HTTP/1.0");
	wifly.println();
    } else {
        Serial.println("Failed to connect");
    }
    
  // Start running the RFID shield
  rfid.begin();
    
  Serial.println("Requesting Firmware Version to make sure comm is working...");

  // Grab the firmware version
  uint32_t versiondata = rfid.getFirmwareVersion();
  
  // If nothing is returned, it didn't work. Loop forever
  if (!versiondata) {
    Serial.print("Didn't find RFID Shield. Check your connection to the Arduino board.");
    while (1); 
  }
 
  // Got ok data, good enough!
  Serial.println("Found Version Data. Comm is working.");

  // Let us know RFID shield is waiting for a tag
  Serial.println("Waiting for an RFID Card ...");

}

void loop() {
// We will store the results of our tag reading in these vars
  uint8_t success;
  uint8_t pId[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t pIdLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)

  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate the length
  success = rfid.readPassiveTargetID(PN532_MIFARE_ISO14443A, pId, &pIdLength);

  // If we succesfully received a tag and it has been greater than the time delay (in seconds)
  if (success &&  (millis() - lastReadTime > (TIME_DELAY * 1000))) {
    Serial.println("Got a tag!");
    // Print out the length
    Serial.print("Length: ");
    Serial.print(pIdLength, HEX);
    Serial.print(", ID: ");
    
    // Print the ID in hex format
    rfid.PrintHex(pId, pIdLength);
    Serial.println("");
    
    if (wifly.open(host, 80)) {
      
      // Send it to the server
      String params = String("{deviceId: '") + deviceId + String("', pId: '") + String((char *)pId) +String("'}");
      String paramsLength = String(params.length());
      
      
      wifly.print("POST ");
      wifly.print(endpoint);
      wifly.println(" HTTP/1.1");
      
      Serial.print("endpoint: ");
      Serial.println(endpoint);
      
      wifly.println("Content-type: application/json");
      wifly.println("Connection: close");
      
      wifly.print("Host: ");
      wifly.println(host);
      Serial.println("Host: "+ String(host));
      
      wifly.print("Content-Length: ");
      wifly.println(paramsLength);
      Serial.println("Content-Length: ");
      Serial.print(paramsLength);
      wifly.println();
      wifly.print(params);
      Serial.println(params);
      
      Serial.println("Posted pId to Music Party Server");
    } else {
      Serial.print("Could not connec to host");
    }

    // Same the last read time
    lastReadTime = millis();
  }
}
