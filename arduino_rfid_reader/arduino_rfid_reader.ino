#include <SoftwareSerial.h>
#include <sm130.h>
NFCReader nfc(7, 8);

//#include <Wire.h>
//#include <Adafruit_NFCShield_I2C.h>
//Adafruit_NFCShield_I2C nfc(2, 3);

const uint8_t TIME_DELAY = 2;
long lastReadTime = 0;


// Setup method is called once every time Arduino is restarted
void setup(void) {

  // Start communication with our serial monitor
  Serial.begin(9600);

  // Start running the RFID shield
  nfc.begin();

  // Print out a message to make sure Serial is working
  Serial.println("Initialized!");
  Serial.println("Requesting Firmware Version to make sure comm is working...");

  // Grab the firmware version
  uint32_t versiondata = nfc.getFirmwareVersion();
  
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
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)

  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate the length
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);

  // If we succesfully received a tag and it has been greater than the time delay (in seconds)
  if (success &&  (millis() - lastReadTime > (TIME_DELAY * 1000))) {
    Serial.println("Got a tag!");
    // Print out the length
    Serial.print("Length: ");
    Serial.print(uidLength, HEX);
    Serial.print(", ID: ");
    
    // Print the ID in hex format
    nfc.PrintHex(uid, uidLength);
    Serial.println("");
    
    // Same the last read time
    lastReadTime = millis();
  }
}


