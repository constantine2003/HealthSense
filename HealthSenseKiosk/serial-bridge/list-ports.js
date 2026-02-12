/**
 * List Available Serial Ports
 * Helper script to find your ESP32's COM port
 */

const { SerialPort } = require('serialport');

console.log('\n🔍 Scanning for serial ports...\n');

SerialPort.list().then((ports) => {
  if (ports.length === 0) {
    console.log('❌ No serial ports found!');
    console.log('\nTips:');
    console.log('- Make sure ESP32 is connected via USB');
    console.log('- Try a different USB cable (must support data)');
    console.log('- Install CH340/CP2102 USB driver if needed');
    return;
  }

  console.log(`✅ Found ${ports.length} serial port(s):\n`);

  ports.forEach((port, index) => {
    console.log(`${index + 1}. ${port.path}`);
    if (port.manufacturer) {
      console.log(`   Manufacturer: ${port.manufacturer}`);
    }
    if (port.serialNumber) {
      console.log(`   Serial Number: ${port.serialNumber}`);
    }
    if (port.vendorId && port.productId) {
      console.log(`   VID:PID: ${port.vendorId}:${port.productId}`);
    }

    // Highlight likely ESP32 ports
    const portName = port.path.toLowerCase();
    const mfg = (port.manufacturer || '').toLowerCase();

    if (
      mfg.includes('silicon labs') ||
      mfg.includes('cp210') ||
      mfg.includes('ch340') ||
      portName.includes('usb')
    ) {
      console.log('   👉 This looks like your ESP32! Use this port.');
    }

    console.log('');
  });

  console.log('\n📝 Update server.js with your ESP32 port:');
  console.log(`   const SERIAL_PORT = '${ports[0].path}';`);
  console.log('');
}).catch((err) => {
  console.error('❌ Error listing ports:', err.message);
});
