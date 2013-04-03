#include <sm130.h>
#include <SoftwareSerial.h>


NFCReader rfid(7, 8);

// The number of seconds to wait before accepting another tag
const uint8_t TIME_DELAY = 2;
// Var to keep track of time between tags
long lastReadTime = 0;

void printTagInfo(uint8_t *pId, uint8_t pIdLength);

void setup()
{
  // Start up the serial connections
  Serial.begin(9600);
 
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
    
    // Same the last read time
    lastReadTime = millis();
  }
}

void printTagInfo(uint8_t *pId, uint8_t pIdLength) {
    Serial.println("Got a tag!");
    Serial.print("Length: ");
    Serial.print(pIdLength, HEX);
    Serial.print(", ID: ");
    rfid.PrintHex(pId, pIdLength);
    Serial.println("");
}
