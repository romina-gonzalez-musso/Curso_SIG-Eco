/// -------------------- CURSO SIG EN ECOLOGIA 2024 ------------------
///                     LANDSAT SURFACE TEMPERATURE 
/// ------------------------------------------------------------------

// Definir que el baselayer sea el Google Satellite -----------------
Map.setOptions('SATELLITE');
Map.centerObject(geometry, 9);

// Definir fecha de inicio y fin ------------------------------------
var startDate = '2023–06–01';
var endDate = '2023–06–21';

// Máscara de nubes y factores de escalado (solo bandas térmicas) ---------
function cloudMask(image) {
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3)
    .or(qa.bitwiseAnd(1 << 4));
  return image.updateMask(mask.not());
}

function applyScaleFactors(image) {
  var thermalBands = image.select('ST.*').multiply(0.00341802).add(149.0) 
  .subtract(273.15); // De Kelvin a Grados Celsius
  return image.addBands(thermalBands, null, true);
}

// Llamar a las colecciones de Landsat 8 y 9 --------------------------------
var L9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2') 
  .select('ST_B10', 'QA_PIXEL')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(cloudMask)
  .map(applyScaleFactors)

var L8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') 
  .select('ST_B10', 'QA_PIXEL')
  .filterBounds(geometry)
  .filter(ee.Filter.lt('CLOUD_COVER', 20))
  .map(cloudMask)
  .map(applyScaleFactors)
  
print(L9, 'Landsat 9 ST');
print(L8, 'Landsat 8 ST')

// Crear el compuesto de imágenes --------------------------------------
var LandsatColl = L8.merge(L9)
var LandsatST = LandsatColl.select("ST_B10").median().clip(geometry)


// Agregar al mapa -----------------------------------------------------

var visST = {
  min: 15, 
  max: 43, 
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003'
  ]}

Map.addLayer(LandsatST, visST, 'Surface Temperature');