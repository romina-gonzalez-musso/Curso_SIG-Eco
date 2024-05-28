/// ---------------- CURSO SIG EN ECOLOGIA 2024 ------------------- //////
///                SERIE TEMPORAL NDVI DE LANDSAT 8
///              EXTRAER NDVI CHART PARA EXPORTAR CSV
/// -------------------------------------------------------------- //////

// DEFINIR FECHAS
// --------- DEFINIR FECHA ----------------------------------------
var inicio = '2013-12-01'
var final = '2023-04-30'


// --------- TRAER COLECCION DE IMAGENES --------------------
var L8_Col= ee.ImageCollection("LANDSAT/LC08/C02/T1_L2") 
  .filterDate (inicio, final) 
  .filterBounds (geometry) 
  .filterMetadata ('CLOUD_COVER', 'Less_Than', 20);
  

// Aplicar los factores de escalado 
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Filtro de nubes completo actualizado a Collection 2
function maskL8sr(image) {
  // Bits de la banda de calidad
  var dilatedCloudBitMask = (1 << 1);
  var cirrusCloudBitMask = (1 << 2);
  var cloudBitMask = (1 << 3);
  var cloudShadowBitMask = (1 << 4);
  //var snowBitMask = (1 << 5);
  // Get the pixel QA band.
  var qa = image.select('QA_PIXEL');
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(dilatedCloudBitMask).eq(0)
                 .and(qa.bitwiseAnd(cirrusCloudBitMask).eq(0))
                 .and(qa.bitwiseAnd(cloudBitMask).eq(0))
                 .and(qa.bitwiseAnd(cloudShadowBitMask).eq(0))
                 //.and(qa.bitwiseAnd(snowBitMask).eq(0))
  return image.updateMask(mask);
}


// Agregar NDVI
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  return image.addBands(ndvi)
}

var L8_Col = L8_Col.map(applyScaleFactors);
var L8_Col = L8_Col.map(maskL8sr).map(addNDVI)

// Crear el gráfico de la serie para exportar  
var chart = ui.Chart.image.series({
  imageCollection: L8_Col.select('NDVI'),
  region: geometry,
  reducer: ee.Reducer.mean(),
  scale: 20
}).setOptions({
      lineWidth: 1,
      pointSize:1,
      title: 'NDVI Time Series',
      interpolateNulls: false,
      vAxis: {title: 'NDVI'},
      hAxis: {title: '', format: 'YYYY-MMM'}
    })
    
print(chart);

print('Tamaño de la coleccion', L8_Col.size())

// Visualizar una imagen

var RGB = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.3,
};

var False = {
  bands: ['SR_B5', 'SR_B6', 'SR_B4'],
  min: 0.0,
  max: 0.3,
};

var VisNDVI = {
  min: 0,
  max: 1,
  palette: [
    'ffffff', 'ce7e45', 'df923d', 'f1b555', 'fcd163', '99b718', '74a901',
    '66a000', '529400', '3e8601', '207401', '056201', '004c00', '023b01',
    '012e01', '011d01', '011301'
  ],
};


Map.addLayer(L8_Col.first(), False, 'La primera imagen')
Map.addLayer(L8_Col.select('NDVI').first(), VisNDVI, 'NDVI')
Map.centerObject(geometry, 10)