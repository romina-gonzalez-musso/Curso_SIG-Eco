/// --------------------------- CURSO SIG EN ECOLOGIA 2023 --------------------------- //////
///                         DESCARGA DE IMÁGENES INDIVIDUALES 
///                                   DEM NASA SRTM 30m
/// --------------------------------------------------------------------------------- //////

// --------- TRAER COLECCION DE IMAGENES ---------------------------
var DEM = ee.Image('USGS/SRTMGL1_003');

var DEM_clip = DEM.clip(geometry)

// --------- VER METADATOS ---------------------------
print(DEM, 'DEM INFO GENERAL')

var Res = (DEM.select('elevation').projection().nominalScale());
print ('Resolucion (m)', Res);

print('Bandas del DEM', DEM.bandNames())


// --------- CALCULAR LA PENDIENTE ---------------------------
var elevacion = DEM_clip.select('elevation'); // En grados de 0 a 90
var pendiente = ee.Terrain.slope(elevacion);


// --------- USAR LA FUNCION ee.Terrain.products ---------------------------
var terrain = ee.Terrain.products(DEM_clip);

print('Bandas de la funcion ee.Terrain.products', terrain.bandNames());


// --------- VISUALIZAR EN EL MAPA ---------------------------
var visDEM = {min: 550, max: 2700,
  palette: ['0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef', '3ae237',
  'b5e22e', 'd6e21f', 'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08',
  'ff500d', 'ff0000', 'de0101', 'c21301']}


Map.centerObject(geometry, 8.5)

// Altidud en gris y en paleta de colores
Map.addLayer(DEM_clip, {min: 600, max: 2500}, 'Altitud (m)');
Map.addLayer(DEM_clip, visDEM, 'Altitud (m) en color');

// Ver la pendiente 
Map.addLayer(pendiente, {min: 0, max: 60}, 'Pendiente (º)');

// Hillshade de la funcion Terrain Products
Map.addLayer(terrain.select('hillshade'), {min: 0, max: 255}, 'Hillshade');



// --------- DESCARGAR ---------------------------------------
Export.image.toDrive({
  image: DEM_clip.select("elevation"),
  description: 'DEM_SRTM_30m',
  scale: 30,
  crs: 'EPSG:22181',
  folder: 'GEE_export',
  region: geometry});
