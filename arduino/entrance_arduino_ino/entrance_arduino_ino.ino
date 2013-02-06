/**************************************************************************/
/*! 
    @file     readMifare.pde
    @author   Adafruit Industries
	@license  BSD (see license.txt)

    This example will wait for any ISO14443A card or tag, and
    depending on the size of the UID will attempt to read from it.
   
    If the card has a 4-byte UID it is probably a Mifare
    Classic card, and the following steps are taken:
   
    - Authenticate block 4 (the first block of Sector 1) using
      the default KEYA of 0XFF 0XFF 0XFF 0XFF 0XFF 0XFF
    - If authentication succeeds, we can then read any of the
      4 blocks in that sector (though only block 4 is read here)
	 
    If the card has a 7-byte UID it is probably a Mifare
    Ultralight card, and the 4 byte pages can be read directly.
    Page 4 is read by default since this is the first 'general-
    purpose' page on the tags.


    This is an example sketch for the Adafruit PN532 NFC/RFID breakout boards
    This library works with the Adafruit NFC breakout 
      ----> https://www.adafruit.com/products/364
 
    Check out the links above for our tutorials and wiring diagrams 
    These chips use I2C to communicate

    Adafruit invests time and resources providing this open source code, 
    please support Adafruit and open-source hardware by purchasing 
    products from Adafruit!
*/
/**************************************************************************/
#include <Wire.h>
#include <Adafruit_NFCShield_I2C.h>

#include <SoftwareSerial.h>

SoftwareSerial impSerial(8, 9); // RX on 8, TX on 9

#define IRQ   (2)
#define RESET (3)  // Not connected by default on the NFC Shield

Adafruit_NFCShield_I2C nfc(IRQ, RESET);
long lastReadTime = 0;

void setup(void) {
  Serial.begin(9600);
  Serial.println("Hello!");
  // set the data rate for the SoftwareSerial port
  impSerial.begin(19200);

  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
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
  
  Serial.println("Waiting for an ISO14443A Card ...");
}


void loop(void) {
  uint8_t success;
  int block_num = 24;
  uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };  // Buffer to store the returned UID
  uint8_t uidLength;                        // Length of the UID (4 or 7 bytes depending on ISO14443A card type)
  uint8_t shouldWrite = false;              // if should write to the fob
  Serial.println("looping");
  // Wait for an ISO14443A type cards (Mifare, etc.).  When one is found
  // 'uid' will be populated with the UID, and uidLength will indicate
  // if the uid is 4 bytes (Mifare Classic) or 7 bytes (Mifare Ultralight)
  success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  
  if (success && millis() - lastReadTime > 2000) {
    // Display some basic information about the card
    Serial.println("Found an ISO14443A card");
    Serial.print("  UID Length: ");Serial.print(uidLength, DEC);Serial.println(" bytes");
    Serial.print("  UID Value: ");
    nfc.PrintHex(uid, uidLength);
    impSerial.print("$");
    writeHexToImp(uid, uidLength);
    impSerial.print("#");
    Serial.println("");
    lastReadTime = millis();
    
    if (uidLength == 4)
    {
      // We probably have a Mifare Classic card ... 
      Serial.println("Seems to be a Mifare Classic card (4 byte UID)");
	  
      // Now we need to try to authenticate it for read/write access
      // Try with the factory default KeyA: 0xFF 0xFF 0xFF 0xFF 0xFF 0xFF
//      Serial.print("Trying to authenticate block ");
//      Serial.print(block_num);
//      Serial.println(" with default KEYA value");
//      uint8_t keya[6] = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };
	  
	  // Start with block 4 (the first block of sector 1) since sector 0
	  // contains the manufacturer data and it's probably better just
	  // to leave it alone unless you know what you're doing
//      success = nfc.mifareclassic_AuthenticateBlock(uid, uidLength, block_num, 0, keya);
//	  
//      if (success)
//      {
//        Serial.println("Sector has been authenticated");
//        uint8_t data[16] = { 'l', 'i', 'f', 'e', 'g', 'r', 'a', 'p', '.h', ' ', 't', 'e', 'a', 'm', 0, 0};
//        // If you want to write something to block 4 to test with, uncomment
//		// the following line and this text should be read back in a minute
//        //success = nfc.mifareclassic_WriteDataBlock (block_num, data);
//        if (success)
//        {
//          Serial.println("Writing the stuff worked I guess");
//        }
//        // Try to read the contents of block block_num
//        success = nfc.mifareclassic_ReadDataBlock(block_num, data);
//		
//        if (success)
//        {
//          // Data seems to have been read ... spit it out
//          Serial.print("Reading Block:");
//          //Serial.print(block_num);
//          //Serial.print(":");
//          printHexPlain(data, 16);
//          Serial.println("");
//		  
//          // Wait a bit before reading the card again
//          delay(1000);
//        }
//        else
//        {
//          Serial.println("O  ... unable to read the requested block.  Try another key?");
//        }
//      }
//      else
//      {
//        Serial.println("Ooops ... authentication failed: Try another key?");
//      }
    }
    
    if (uidLength == 7)
    {
      // We probably have a Mifare Ultralight card ...
      Serial.println("Seems to be a Mifare Ultralight tag (7 byte UID)");
	  
      // Try to read the first general-purpose user page (#4)
//      Serial.println("Reading page 4");
//      uint8_t data[32];
//      success = nfc.mifareultralight_ReadPage (4, data);
//      if (success)
//      {
//        // Data seems to have been read ... spit it out
//        nfc.PrintHexChar(data, 4);
//        Serial.println("");
//		
//        // Wait a bit before reading the card again
//        delay(1000);
//      }
//      else
//      {
//        Serial.println("Ooops ... unable to read the requested page!?");
//      }
    }
  }
}


/**************************************************************************/
/*! 
    @brief  Prints a hexadecimal value in plain characters

    @param  data      Pointer to the byte data
    @param  numBytes  Data length in bytes
*/
/**************************************************************************/
void printHexPlain(const byte * data, const uint32_t numBytes)
{
  uint32_t szPos;
  for (szPos=0; szPos < numBytes; szPos++) 
  {
    if (data[szPos] <= 0x1F)
      Serial.print("");
    else
      Serial.print((char)data[szPos]);
  }
  Serial.println("");
}

void writeHexToImp(const byte * data, const uint32_t numBytes)
{
  uint32_t szPos;
  for (szPos=0; szPos < numBytes; szPos++) 
  {
    impSerial.print("0x");
    // Append leading 0 for small values
    if (data[szPos] <= 0xF)
      impSerial.print("0");
    impSerial.print(data[szPos], HEX);
    if ((numBytes > 1) && (szPos != numBytes - 1))
    {
      impSerial.print(" ");
    }
  }
//  Serial.println("");
}
