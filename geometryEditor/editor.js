const API_URL =
  "https://script.google.com/macros/s/AKfycbzEZPjdh6VhO_sc3147Tmv_FR3A3kgud70TxzRR3IU6K5EWQPW6Jlw7Yo_pRc-dAYwv/exec";
const WRITE_API_URL =
  "https://script.google.com/macros/s/AKfycbzHAjeoibL9UgJEQ_yUj_PWlTeT49a3Sq6CIi9Kc3wz1r_jzTVLekxeu3u8ybSLdd0/exec";

const map =
  L.map("map").setView(
    [20, 0],
    2
  );

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution:
      '&copy; OpenStreetMap contributors'
  }
).addTo(map);

map.pm.addControls({
  position: "topleft",
  drawText: false,
  drawCircle: false,
  drawCircleMarker: false,
  drawMarker: false,
  drawPolyline: false,
  drawRectangle: false,
  drawPolygon: true,
  editMode: true,
  dragMode: false,
  cutPolygon: false,
  removalMode: true
});

let currentGeometry = null;
let currentLayer = null;
let currentLayerGroup = null;
let regionGeometryRecords = [];

function updateGeometryOutput() {

  const output =
    document.getElementById(
      "geometryOutput"
    );

  if (!currentGeometry) {

    output.textContent =
      "No geometry drawn yet.";

    return;

  }

  output.textContent =
    JSON.stringify(
      currentGeometry,
      null,
      2
    );

}


function updateGeometryFromLayer(layer) {

  if (!layer) {
    currentGeometry = null;
    updateGeometryOutput();
    return;
  }

  const geoJSON =
    layer.toGeoJSON();

  currentGeometry =
    geoJSON.geometry;

  updateGeometryOutput();

}
map.on(
  "pm:create",
  event => {
    currentLayerGroup = null;

    currentLayer =
      event.layer;

    updateGeometryFromLayer(
      currentLayer
    );

    currentLayer.on(
      "pm:edit",
      () => {
        updateGeometryFromLayer(
          currentLayer
        );
      }
    );
  }
);


map.on(
  "pm:remove",
  event => {

    if (
      currentLayer &&
      event.layer === currentLayer
    ) {

      currentLayer = null;
      currentGeometry = null;

      updateGeometryOutput();

    }

  }
);

async function loadRegions() {

  const regionSelect =
    document.getElementById(
      "regionSelect"
    );
  const geometryMethod =
    document.getElementById(
      "geometryMethod"
    );

  try {

    const response =
      await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "Editor API response:",
      data
    );

    if (
      !data.success ||
      !Array.isArray(data.regions)
    ) {
      throw new Error(
        "API did not return regions."
      );
    }

    if (!Array.isArray(data.regionGeometry)) {
      throw new Error(
        "API did not return region geometry."
      );
    }

    regionGeometryRecords =
      data.regionGeometry;

    console.log(
      "Loaded region geometry:",
      regionGeometryRecords
    );

    data.regions
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name)
      )
      .forEach(
        region => {
          const option =
            document.createElement(
              "option"
            );

          option.value =
            region.id;

          option.textContent =
            region.name;

          option.dataset.regionType = region.type;

          regionSelect.appendChild(
            option
          );
        }
      );

    updateGeometryMethod();
  } catch (error) {

    console.error(
      "Could not load regions:",
      error
    );

  }

}


//Helper function for clearing map layers
function removeCurrentGeometryLayer() {
  if (!currentLayer) {
    return;
  }

  const parentIDs =
    Object.keys(
      currentLayer._eventParents || {}
    );

  parentIDs.forEach(
    parentID => {
      const parentLayer =
        map._layers[parentID];

      if (parentLayer) {
        map.removeLayer(
          parentLayer
        );
      }
    }
  );

  if (map.hasLayer(currentLayer)) {
    map.removeLayer(
      currentLayer
    );
  }

  currentLayer = null;
  currentLayerGroup = null;
}

function clearCurrentGeometry() {
  if (currentLayerGroup) {

    map.removeLayer(
      currentLayerGroup
    );

    currentLayerGroup = null;
  }

  if (currentLayer) {

    map.removeLayer(
      currentLayer
    );

    currentLayer = null;
  }

  currentGeometry = null;

  updateGeometryOutput();
}

function updateGeometryMethod() {
  const regionSelect =
    document.getElementById(
      "regionSelect"
    );

  const geometryMethod =
    document.getElementById(
      "geometryMethod"
    );

  const selectedOption =
    regionSelect.options[
      regionSelect.selectedIndex
    ];

  if (!regionSelect.value) {
    geometryMethod.textContent =
      "Select a region to see its geometry method.";
    return;
  }

  const regionType =
    selectedOption.dataset.regionType;

  const hasSavedGeometry =
    regionGeometryRecords.some(
      geometry =>
        String(
          geometry.regionID
        ) === String(
          regionSelect.value
        )
    );

  if (regionType === "Country") {
    geometryMethod.textContent =
      "Existing country boundary — no drawing needed.";
    return;
  }

  if (regionType === "City") {
    if (hasSavedGeometry) {
      geometryMethod.textContent =
        "Custom geometry — saved geometry loaded.";
    } else {
      geometryMethod.textContent =
        "Existing administrative boundary — no drawing needed.";
    }

    return;
  }

  if (hasSavedGeometry) {
    geometryMethod.textContent =
      "Custom geometry — saved geometry loaded.";
  } else {
    geometryMethod.textContent =
      "Custom geometry — draw the boundary.";
  }
}

function loadSelectedRegionGeometry() {
  const regionSelect =
    document.getElementById(
      "regionSelect"
    );

  const regionID =
    regionSelect.value;

  clearCurrentGeometry();

  if (!regionID) {
    return;
  }

  const selectedOption =
    regionSelect.options[
      regionSelect.selectedIndex
    ];

  const regionType =
    selectedOption.dataset.regionType;

  if (regionType === "Country") {
    return;
  }

  const matchingGeometry =
    regionGeometryRecords
      .filter(
        geometry =>
          String(
            geometry.regionID
          ) === String(regionID)
      )
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ) -
          new Date(
            a.updatedAt
          )
      );

  if (
    matchingGeometry.length === 0
  ) {
    return;
  }

  const latestGeometry =
    matchingGeometry[0];

  let geometry =
    latestGeometry.geometry;

  if (
    typeof geometry === "string"
  ) {
    geometry =
      JSON.parse(geometry);
  }

  const feature = {
    type: "Feature",
    properties: {},
    geometry: geometry
  };


  const geoJsonLayer =
    L.geoJSON(feature);

  geoJsonLayer.addTo(map);

  currentLayerGroup =
    geoJsonLayer;

  currentLayer =
    geoJsonLayer.getLayers()[0];

  updateGeometryFromLayer(
    currentLayer
  );

  currentLayer.on(
    "pm:edit",
    () => {
      updateGeometryFromLayer(
        currentLayer
      );
    }
  );

  if (currentLayer) {
    map.fitBounds(
      currentLayer.getBounds(),
      {
        padding: [30, 30]
      }
    );
  }
}

document
  .getElementById("regionSelect")
  .addEventListener(
    "change",
    () => {
      updateGeometryMethod();
      loadSelectedRegionGeometry();
    }
  );

loadRegions();
async function saveGeometry() {

  const regionSelect =
    document.getElementById(
      "regionSelect"
    );

  const regionID =
    regionSelect.value;

  if (!regionID) {

    alert(
      "Please select a region before saving."
    );

    return;

  }

  if (!currentGeometry) {

    alert(
      "Please draw a region boundary before saving."
    );

    return;

  }

  const payload = {

    regionID: regionID,

    geometry: currentGeometry,

    source: "drawn",

    notes: ""

  };

  try {

    const response =
      await fetch(
        WRITE_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    if (!response.ok) {

      throw new Error(
        `Save request failed: ${response.status}`
      );

    }

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        data.error ||
        "The geometry could not be saved."
      );

    }

    alert(
      "Geometry saved successfully."
    );

  } catch (error) {

    console.error(
      "Could not save geometry:",
      error
    );

    alert(
      `Could not save geometry: ${error.message}`
    );

  }

}


document
  .getElementById("saveButton")
  .addEventListener(
    "click",
    saveGeometry
  );
document
  .getElementById("clearButton")
  .addEventListener(
    "click",
    clearCurrentGeometry
  );
