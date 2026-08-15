/**
 * فك تشفير Polyline بصيغة Google القياسية (نفس الخوارزمية المستخدمة في
 * الباك اند: routes.polyline.encodedPolyline لمزوّد Google، وencodePolyline
 * الداخلي لمزوّد internal). النتيجة مصفوفة {latitude, longitude} جاهزة
 * للاستخدام المباشر في <Polyline coordinates={...} /> من react-native-maps.
 *
 * المرجع: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  if (!encoded) return [];

  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}
