#include <WiFlyHQ.h>
#include <Lifegraph.h>
#include <sm130.h>
#include <SoftwareSerial.h>
#include <avr/pgmspace.h>


NFCReader rfid(7, 8);
SoftwareSerial wifiSerial(2,3);
JSONAPI api;

/* Change these to match your WiFi network */
const char mySSID[] = "OLIN_GUEST";
const char myPassword[] = "The_Phoenix_Flies";

const char host[] = "musicparty.herokuapp.com";

// The number of seconds to wait before accepting another tag
const uint8_t TIME_DELAY = 2;
// Var to keep track of time between tags
long lastReadTime = 0;

// Unique ID of this Music Party Streaming Device
char deviceId[] = "test-party";

//void pIdStringFromInts(char *pIdStringBuffer, uint8_t *pId, uint8_t pIdLength);
void printTagInfo(uint8_t *pId, uint8_t pIdLength);

void setup()
{
  // Start up the serial connections
  Serial.begin(9600);
  wifiSerial.begin(9600);
  
  Serial.println("Connecting WiFly...");
 
  // Setup network connection.
  if (!connectWifi(&wifiSerial, mySSID, myPassword)) {
    Serial.println("Failed to join network.");
  } else {
    Serial.println("Joined wifi network.");
  }
  
  // Create an object to send http requests  
  api = JSONAPI(host, "", LIFEGRAPH_BUFFER, LIFEGRAPH_BUFFER_SIZE);
  
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
  
    // Start listening for an RFID tag again
    rfid.begin();
// We will store the results of our tag reading in these vars
  uint8_t success;
  uint8_t pId[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t pIdLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)
  
  char pIdString[24];

  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate the length
  success = rfid.readPassiveTargetID(PN532_MIFARE_ISO14443A, pId, &pIdLength);

  // If we succesfully received a tag and it has been greater than the time delay (in seconds)
  if (success &&  (millis() - lastReadTime > (TIME_DELAY * 1000))) {
    
    // Print out the information about the tag
    printTagInfo(pId, pIdLength);
    
    // Start using the wifi serial so we can sent a request
    wifiSerial.listen();

    // Send the next post to the tap endpoint
    api.post("/tap");
    // Add the device Idparam
    api.form("deviceId", deviceId);
    // Add the pId param
  
//    pIdStringFromInts(pIdString, pId, pIdLength);

//    char * origin = pIdString;
//    while (pId++) {
//      
//      pIdString+= snprintf(pIdString, 3, "%02x", pId);
//    }
//    Serial.print("String PID");
//    Serial.println(pIdString);
    
    api.form("pId", "30");  
    
    // Send the request and get a response
    int response = api.request();
    
    // Print out the response
    if (response) Serial.println("Server response: " + String(response));
    
    // Same the last read time
    lastReadTime = millis();
  }
  
  Serial.print("Free memory: ");
  Serial.println(freeRam(), DEC);
}

//void pIdStringFromInts(char *pIdStringBuffer, uint8_t *pId, uint8_t pIdLength) {
//
//  snprintf(pIdStringBuffer, 24, "%02x", pId);
//}
void printTagInfo(uint8_t *pId, uint8_t pIdLength) {
    Serial.println("Got a tag!");
    Serial.print("Length: ");
    Serial.print(pIdLength, HEX);
    Serial.print(", ID: ");
    rfid.PrintHex(pId, pIdLength);
    Serial.println("");
}
int freeRam () {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}
