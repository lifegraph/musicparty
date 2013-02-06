
// (Based on Ethernet's WebClient Example)

#include <SPI.h>
#include <WiFly.h>

WiFlyClient client("jezzpaul.com", 80);


void setup() {
  Serial.begin(9600);

  WiFly.begin();
  
  if (!WiFly.join("OLIN_GUEST", "The_Phoenix_Flies")) {
    Serial.println("Association failed.");
    while (1) {
      // Hang on failure.
    }
  }  

  Serial.println("connecting...");

  if (client.connect()) {
    Serial.println("connected");
    client.println("GET /");
    client.println("Host: jezzpaul.com");
  } else {
    Serial.println("connection failed");
  }
  
}

void loop() {
  if (client.available()) {
    char c = client.read();
    Serial.print(c);
  }
  
  if (!client.connected()) {
    Serial.println();
    Serial.println("disconnecting.");
    client.stop();
    for(;;)
      ;
  }
}
