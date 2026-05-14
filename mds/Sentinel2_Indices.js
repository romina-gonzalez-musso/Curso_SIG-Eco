// ============================================================
// ÍNDICES DE VEGETACIÓN Y AGUA - SENTINEL-2
// Índices: NDVI, SAVI, EVI, MNDWI
// Colección: COPERNICUS/S2_SR_HARMONIZED
// ============================================================

// Definir que el baselayer sea el Google Satellite -----------------------
Map.setOptions('SATELLITE');
Map.centerObject(geometry, 8);

// Definir fecha de inicio y fin ------------------------------------------
var startDate = '2023-06-01';
var endDate   = '2023-06-21';

// Máscara de nubes -------------------------------------------------------
// Sentinel-2 usa la banda SCL (Scene Classification Layer)
// Valores a enmascarar: 3=sombra, 8=nube media, 9=nube alta, 10=cirrus
function cloudMaskS2(image) {
  var scl  = image.select('SCL');
  var mask = scl.eq(3)   // Sombra de nube
               .or(scl.eq(8))   // Nube probabilidad media
               .or(scl.eq(9))   // Nube probabilidad alta
               .or(scl.eq(10)); // Cirrus
  return image.updateMask(mask.not());
}

// Factores de escala para bandas ópticas (Surface Reflectance) -----------
// Sentinel-2 C02 SR: reflectancia = DN / 10000
function applyScaleFactors(image) {
  var opticalBands = image.select('B.*').divide(10000);
  return image.addBands(opticalBands, null, true);
}

// Cálculo de índices espectrales -----------------------------------------

// NDVI – Normalized Difference Vegetation Index
// Rango: -1 a 1 | Vegetación densa > 0.5
// NDVI = (NIR - Red) / (NIR + Red)
// Sentinel-2: NIR = B8, Red = B4
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4'])
                  .rename('NDVI');
  return image.addBands(ndvi);
}

// SAVI – Soil Adjusted Vegetation Index
// Reduce el efecto del suelo desnudo en áreas de baja cobertura vegetal
// SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)   → L = 0.5
// Sentinel-2: NIR = B8, Red = B4
function addSAVI(image) {
  var L    = 0.5;
  var nir  = image.select('B8');
  var red  = image.select('B4');
  var savi = nir.subtract(red)
               .divide(nir.add(red).add(L))
               .multiply(1 + L)
               .rename('SAVI');
  return image.addBands(savi);
}

// EVI – Enhanced Vegetation Index
// Más robusto que NDVI en zonas de alta biomasa y con aerosoles
// EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
// Sentinel-2: NIR = B8, Red = B4, Blue = B2
function addEVI(image) {
  var nir  = image.select('B8');
  var red  = image.select('B4');
  var blue = image.select('B2');
  var evi  = nir.subtract(red)
               .multiply(2.5)
               .divide(nir.add(red.multiply(6))
                          .subtract(blue.multiply(7.5))
                          .add(1))
               .rename('EVI');
  return image.addBands(evi);
}

// MNDWI – Modified Normalized Difference Water Index
// Resalta cuerpos de agua y suprime vegetación y suelo
// MNDWI = (Green - SWIR1) / (Green + SWIR1)
// Sentinel-2: Green = B3, SWIR1 = B11
function addMNDWI(image) {
  var mndwi = image.normalizedDifference(['B3', 'B11'])
                   .rename('MNDWI');
  return image.addBands(mndwi);
}

// Llamar a la colección de Sentinel-2 ------------------------------------
// SR_HARMONIZED: reflectancia de superficie, colección armonizada
// Bandas ópticas necesarias + SCL para la máscara de nubes
var bandsS2 = ['B2', 'B3', 'B4', 'B8', 'B11', 'SCL'];

var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .select(bandsS2)
  .filterBounds(geometry)
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
  .map(cloudMaskS2)
  .map(applyScaleFactors)
  .map(addNDVI)
  .map(addSAVI)
  .map(addEVI)
  .map(addMNDWI);

print(S2, 'Sentinel-2 - Índices');

// Crear el compuesto de imágenes (mediana) --------------------------------
var NDVI  = S2.select('NDVI') .median().clip(geometry);
var SAVI  = S2.select('SAVI') .median().clip(geometry);
var EVI   = S2.select('EVI')  .median().clip(geometry);
var MNDWI = S2.select('MNDWI').median().clip(geometry);

// Paletas de visualización ------------------------------------------------
var visNDVI = {
  min: -0.2, max: 0.8,
  palette: ['ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163',
            '99b718', '74a901', '66a000', '529400', '3e8601',
            '207401', '056201', '004c00', '023b01', '012e01']
};

var visSAVI = {
  min: -0.2, max: 0.7,
  palette: ['f5f5dc', 'aacc00', '4d7a00', '1a4d00']
};

var visEVI = {
  min: -0.2, max: 0.8,
  palette: ['ffffff', 'fde8b0', 'b5e22e', '3ae237', '1a9900', '004c00']
};

var visMNDWI = {
  min: -0.5, max: 0.5,
  palette: ['8b4513', 'f5f5dc', '00bfff', '0000ff', '00008b']
};

// Agregar capas al mapa ---------------------------------------------------
Map.addLayer(NDVI,  visNDVI,  'NDVI  (Sentinel-2)');
Map.addLayer(SAVI,  visSAVI,  'SAVI  (Sentinel-2)');
Map.addLayer(EVI,   visEVI,   'EVI   (Sentinel-2)');
Map.addLayer(MNDWI, visMNDWI, 'MNDWI (Sentinel-2)');

// Exportar a Google Drive -------------------------------------------------
// Sentinel-2 tiene resolución nativa de 10 m (bandas VIS/NIR) y 20 m (SWIR)
Export.image.toDrive({
  image: NDVI,
  description: 'S2_NDVI',
  scale: 10,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: SAVI,
  description: 'S2_SAVI',
  scale: 10,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: EVI,
  description: 'S2_EVI',
  scale: 10,
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});

Export.image.toDrive({
  image: MNDWI,
  description: 'S2_MNDWI',
  scale: 20,           // SWIR1 (B11) tiene resolución nativa de 20 m
  crs: 'EPSG:4326',
  folder: 'GEE_export'
});
