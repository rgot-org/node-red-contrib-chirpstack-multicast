# node-red-contrib-chirpstack-multicast

Node-RED node for sending multicast downlinks to ChirpStack v4 LoRaWAN network server.
This node was generated using claude.ai

## Features

- ✅ Send multicast downlinks to groups of LoRaWAN devices
- ✅ Support for ChirpStack v4.x (gRPC API)
- ✅ Multiple data format support (Buffer, Hex, Base64, UTF-8)
- ✅ Cayenne LPP compatible
- ✅ Debug mode for troubleshooting
- ✅ Complete error handling

## Installation
```bash
npm install node-red-contrib-chirpstack-multicast
```

Or install directly from Node-RED's palette manager.

## Requirements

- Node-RED >= 2.0.0
- ChirpStack v4.x
- LoRaWAN devices in Class C mode
- Configured multicast group in ChirpStack

## Configuration

### 1. Add ChirpStack Server Configuration

1. Drag the `chirpstack-multicast` node into your flow
2. Double-click to configure
3. Create a new server configuration:
   - **Server**: Your ChirpStack server address (e.g., `localhost:8080`)
   - **API Token**: Your ChirpStack API key

### 2. Configure Multicast Node

- **Name**: Optional node name
- **Server**: Select your ChirpStack server
- **Group ID**: Multicast group ID (optional, can be provided via `msg`)
- **fPort**: LoRaWAN application port (default: 10)
- **Debug**: Enable debug logging

## Usage

### Basic Example
```javascript
msg.multicastGroupId = "4820fc7f-0579-46a6-a67f-96d46e2c0cd7";
msg.fPort = 10;
msg.payload = "Hello World";
return msg;
```

### Send Buffer
```javascript
msg.multicastGroupId = "4820fc7f-0579-46a6-a67f-96d46e2c0cd7";
msg.payload = Buffer.from([0x01, 0x02, 0x03, 0x04]);
return msg;
```

### Send Hex String
```javascript
msg.payload = "48656C6C6F";  // "Hello" in hex
return msg;
```

### Cayenne LPP Example
```javascript
// Temperature sensor (channel 1)
const buf = Buffer.alloc(4);
buf[0] = 1;     // Channel
buf[1] = 0x67;  // Temperature type
buf[2] = 0x01;  // Value high byte (25.6°C)
buf[3] = 0x00;  // Value low byte

msg.multicastGroupId = "your-group-id";
msg.payload = buf;
return msg;
```

### Complete Weather Station Example
```javascript
function encodeCayenneLPP(temp1, temp2, hum1, hum2) {
    const buf = Buffer.alloc(14);
    let i = 0;
    
    // Channel 1 - Temperature
    buf[i++] = 1; buf[i++] = 0x67;
    let t1 = Math.round(temp1 * 10);
    buf[i++] = (t1 >> 8) & 0xFF; 
    buf[i++] = t1 & 0xFF;
    
    // Channel 2 - Temperature
    buf[i++] = 2; buf[i++] = 0x67;
    let t2 = Math.round(temp2 * 10);
    buf[i++] = (t2 >> 8) & 0xFF; 
    buf[i++] = t2 & 0xFF;
    
    // Channel 3 - Humidity
    buf[i++] = 3; buf[i++] = 0x68;
    buf[i++] = Math.round(hum1 * 2);
    
    // Channel 4 - Humidity
    buf[i++] = 4; buf[i++] = 0x68;
    buf[i++] = Math.round(hum2 * 2);
    
    return buf;
}

msg.multicastGroupId = "4820fc7f-0579-46a6-a67f-96d46e2c0cd7";
msg.fPort = 10;
msg.payload = encodeCayenneLPP(25.5, 22.3, 65, 58);
return msg;
```

## Input

### msg.multicastGroupId
**Type**: `string`  
**Required**: Yes (if not configured in node)  
The UUID of the multicast group in ChirpStack.

### msg.fPort
**Type**: `number`  
**Required**: No (default: 10)  
LoRaWAN application port (1-223).

### msg.payload
**Type**: `Buffer | string | object`  
**Required**: Yes  
The data to send. Supports:
- **Buffer**: Raw binary data
- **Hex string**: `"48656C6C6F"`
- **Base64 string**: `"SGVsbG8="`
- **UTF-8 string**: `"Hello"`

## Output

### msg.payload (Success)
```javascript
{
  "success": true,
  "fCnt": 42,
  "multicastGroupId": "4820fc7f-0579-46a6-a67f-96d46e2c0cd7",
  "fPort": 10,
  "timestamp": "2024-11-05T10:30:00.000Z"
}
```

### msg.payload (Error)
```javascript
{
  "success": false,
  "error": "Error message"
}
```

## Supported Data Formats

| Format | Example | Detection |
|--------|---------|-----------|
| Buffer | `Buffer.from([0x01, 0x02])` | `Buffer.isBuffer()` |
| Hex | `"48656C6C6F"` | Regex: `^[0-9A-Fa-f]+$` |
| Base64 | `"SGVsbG8="` | Regex: `^[A-Za-z0-9+/=]+$` |
| UTF-8 | `"Hello World"` | Default fallback |

## ChirpStack Configuration

### Create Multicast Group

1. In ChirpStack web interface, go to **Applications**
2. Select your application
3. Click **Multicast groups** → **Create**
4. Configure:
   - **Name**: Your group name
   - **Region**: EU868, US915, etc.
   - **Multicast address**: 4-byte address
   - **Network session key** (McNwkSKey)
   - **Application session key** (McAppSKey)
   - **Frame counter**: Start at 0
   - **Data rate**: Compatible with all devices
   - **Frequency**: RX2 frequency for your region

### Add Devices to Group

1. Go to your multicast group
2. Click **Add device**
3. Select devices (must be Class C)

### Configure Devices for Class C

Your LoRa-E5 modules must be in Class C:
```
AT+CLASS=C
```

## Troubleshooting

### "Multicast Group ID manquant"
- Ensure `multicastGroupId` is set in node configuration or `msg`

### "Erreur gRPC"
- Check ChirpStack server address (default: `localhost:8080`)
- Verify API token is valid
- Check ChirpStack logs: `docker logs -f chirpstack`

### Devices not receiving
- Verify devices are in **Class C** mode
- Check devices are members of the multicast group
- Verify multicast group frequency and data rate
- Check ChirpStack gateway connection

### Debug Mode
Enable debug mode in node configuration to see:
- Multicast Group ID
- fPort
- Data (hex and base64)

## Example Flow
```json
[{"id":"inject1","type":"inject","name":"Test Multicast","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":140,"y":100,"wires":[["function1"]]},{"id":"function1","type":"function","name":"Prepare Data","func":"msg.multicastGroupId = \"4820fc7f-0579-46a6-a67f-96d46e2c0cd7\";\nmsg.fPort = 10;\nmsg.payload = Buffer.from(\"Hello\");\nreturn msg;","outputs":1,"x":310,"y":100,"wires":[["multicast1"]]},{"id":"multicast1","type":"chirpstack-multicast","name":"Send Multicast","server":"server1","multicastGroupId":"","fPort":10,"debug":true,"x":500,"y":100,"wires":[["debug1"]]},{"id":"debug1","type":"debug","name":"Response","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","x":680,"y":100,"wires":[]}]
```

## API Reference

### gRPC Service
Uses ChirpStack's `MulticastGroupService.Enqueue` method.

### Protobuf Definition
```protobuf
service MulticastGroupService {
  rpc Enqueue(EnqueueMulticastGroupQueueItemRequest) returns (EnqueueMulticastGroupQueueItemResponse);
}
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

Votre Nom

## Links

- [GitHub Repository](https://github.com/votre-username/node-red-contrib-chirpstack-multicast)
- [npm Package](https://www.npmjs.com/package/node-red-contrib-chirpstack-multicast)
- [ChirpStack Documentation](https://www.chirpstack.io/docs/)
- [Node-RED](https://nodered.org/)

## Changelog

### 1.0.0
- Initial release
- Support for ChirpStack v4.x
- Multiple data format support
- Debug mode