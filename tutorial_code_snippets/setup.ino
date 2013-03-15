// Use the wire library for communication with the RFID shield
#include <Wire.h>

// Use the Adafruit library for easy methods to call on the RFID shield
#include <Adafruit_NFCShield_I2C.h>

// Define the 2 pins we'll use for communication 
#define IRQ   (2)
#define RESET (3)  // Not connected by default on the NFC Shield

// Create an nfc object using comm on the IRQ and RESET pins
Adafruit_NFCShield_I2C nfc(IRQ, RESET);

// Setup method is called once every time Arduino is restarted
void setup(void) {

  // Start communication with our serial monitor
  Serial.begin(9600);
  
  // Print out a message to make sure Serial is working
  Serial.println("Hello!");

  // Start running the RFID shield
  nfc.begin();

  // Grab the firmware version
  uint32_t versiondata = nfc.getFirmwareVersion();
  
  // If nothing is returned, it didn't work. Loop forever
  if (! versiondata) {
    Serial.print("Didn't find PN53x board");
    while (1); // halt
  }
  
  // Got ok data, print it out!
  Serial.print("Found chip PN5"); Serial.println((versiondata>>24) & 0xFF, HEX); 
  Serial.print("Firmware ver. "); Serial.print((versiondata>>16) & 0xFF, DEC); 
  Serial.print('.'); Serial.println((versiondata>>8) & 0xFF, DEC);

  // configure board to read RFID tags
  nfc.SAMConfig();

  // Let us know RFID shield is waiting for a tag
  Serial.println("Waiting for an ISO14443A Card ...");
}

// Loop gets called continuously
void loop() {

}