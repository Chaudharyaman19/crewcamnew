import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type LocationMapProps = {
  latitude: number;
  longitude: number;
};

const getMapHtml = (latitude: number, longitude: number) => `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body, iframe {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        border: 0;
        overflow: hidden;
        background: #091b33;
      }
    </style>
  </head>
  <body>
    <iframe
      src="https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
  </body>
</html>
`;

export default function LocationMap({ latitude, longitude }: LocationMapProps) {
  return (
    <View style={styles.mapShell}>
      <WebView
        originWhitelist={['*']}
        source={{ html: getMapHtml(latitude, longitude) }}
        style={styles.map}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#091b33',
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: 'rgba(127,246,255,0.92)',
  },
  map: {
    flex: 1,
    backgroundColor: '#091b33',
  },
});
