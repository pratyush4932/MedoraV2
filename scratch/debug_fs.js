const FileSystem = require('expo-file-system');
console.log('FileSystem keys:', Object.keys(FileSystem));
if (FileSystem.EncodingType) {
  console.log('EncodingType keys:', Object.keys(FileSystem.EncodingType));
} else {
  console.log('EncodingType is undefined');
}
