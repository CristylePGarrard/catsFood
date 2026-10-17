// ============================================================
// OUR FOOD JOURNEY
// Prototype data
// IMPORTANT:
// This is temporary sample data.
// Eventually this information will come from:
// Google Sheets → Google Apps Script → JavaScript
// ============================================================

// ============================================================
// FOOD JOURNEY DATA
// Data comes from:
// Google Sheets → Google Apps Script → JavaScript
// ============================================================

//  "https://script.google.com/macros/s/AKfycbwHMS0Vd9JsJqNhCLaJjCzt2xyON1W2fF9byYwpQBz9ficf03xSuUFElCF18UOA6mixnQ/exec";
const API_URL =
  "https://script.google.com/macros/s/AKfycbzEZPjdh6VhO_sc3147Tmv_FR3A3kgud70TxzRR3IU6K5EWQPW6Jlw7Yo_pRc-dAYwv/exec"
let experiences = [];
let regions = [];
let regionGeometry = [];

// ============================================================
// LOAD FOOD DATA
// ============================================================


async function loadExperiences() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "API returned an error.");
    }

    experiences = data.experiences || [];
    regions = data.regions || [];
    regionGeometry = data.regionGeometry || [];

    console.log(
      `Loaded ${experiences.length} food experiences from Google Sheets.`
    );

    console.log(
      `Loaded ${regions.length} regions from Google Sheets.`
    );

    console.log(
      `Loaded ${regionGeometry.length} region geometry records from Google Sheets.`
    );

  } catch (error) {
    console.error("Could not load food journey data:", error);
  }
}

// ============================================================
// MAP
// ============================================================

const map = L.map("map", {
  worldCopyJump: true,
  minZoom: 2
}).setView([25, 0], 2);

// OpenStreetMap background
L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "&copy; OpenStreetMap contributors"
  }
).addTo(map);

// ============================================================
// MAP COLORS
// ============================================================
// All of the map's visual colors live here.
//
// If we decide later that the map should be blue, yellow,
// purple, etc., we only need to change the theme values here.
// The heat-map calculations will automatically create all of
// the colors in between.
//
// The color scale is based on the largest directly assigned region count.

// ============================================================
// GET MAXIMUM FOOD COUNT
// ============================================================
let maximumFoodCount = 0;

function getMaximumFoodCount(experiences) {
  if (!experiences || experiences.length === 0) return 0;

  const regionCounts = {};

  // Count each food only toward its explicitly assigned region.
  for (const exp of experiences) {
    const regionID = exp.region?.id;

    if (regionID === null || regionID === undefined || regionID === "") {
      continue;
    }

    const key = String(regionID);
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  }

  return Math.max(0, ...Object.values(regionCounts));
}

const heatMapTheme = {
  // Lightest color = countries with fewer foods
  light: "#dce7d8",
  // Darkest color = countries with more foods
  dark: "#375c30",
  // Countries we haven't explored yet
  unexplored: "#cbd2ce",
  // Normal country borders
  border: "#536b4e",
  // Border when hovering over a country
  hoverBorder: "#8b5e3c"
};

// Countries we have not explored yet.
const defaultStyle = {
  color: heatMapTheme.border,
  weight: 0.8,
  fillColor: heatMapTheme.unexplored,
  fillOpacity: 0.55
};

// ============================================================
// COLOR CONVERSION
// ============================================================
//
// Converts a hex color into RGB values so we can mathematically
// blend between our light and dark theme colors.
//

function hexToRgb(hex) {
  const cleanHex =
    hex.replace("#", "");
  return {
    r: parseInt(
      cleanHex.substring(0, 2),
      16
    ),
    g: parseInt(
      cleanHex.substring(2, 4),
      16
    ),
    b: parseInt(
      cleanHex.substring(4, 6),
      16
    )
  };
}


// ============================================================
// COLOR BLENDING
// ============================================================
// Takes two colors and returns a color somewhere between them.
//
// intensity = 0 → completely light
// intensity = 1 → completely dark

function blendColors(lightColor, darkColor, intensity) {
  const light =
    hexToRgb(lightColor);
  const dark =
    hexToRgb(darkColor);
  const amount =
    Math.max(
      0,
      Math.min(1, intensity)
    );
  const r =
    Math.round(
      light.r +
      (dark.r - light.r) * amount
    );
  const g =
    Math.round(
      light.g +
      (dark.g - light.g) * amount
    );
  const b =
    Math.round(
      light.b +
      (dark.b - light.b) * amount
    );
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================
// HEAT MAP COLOR
// ============================================================
// More foods from a country = deeper version of our theme color.

function getHeatMapColor(intensity) {
  return blendColors(
    heatMapTheme.light,
    heatMapTheme.dark,
    intensity
  );
}

// ============================================================
// GET COUNTRY FOOD COUNT
// ============================================================

function getCountryFoodCount(countryCode) {
  return experiencesForCountry(
    countryCode
  ).length;
}

// ============================================================
// GET COUNTRY INTENSITY
// ============================================================
// A logarithmic scale keeps the map useful when one country
// has many more foods than the others.

function getCountryIntensity(foodCount, maximumFoodCount) {
  if (foodCount <= 0) {
    return 0;
  }
  if (maximumFoodCount <= 1) {
    return 1;
  }
  return (
    Math.log1p(foodCount) /
    Math.log1p(maximumFoodCount)
  );
}

// ============================================================
// GET EXPLORED COUNTRY STYLE
// ============================================================

function getExploredStyle(foodCount, maximumFoodCount) {
  const intensity =
    getCountryIntensity(
      foodCount,
      maximumFoodCount
    );
  return {
    color:
      heatMapTheme.border,
    weight:
      intensity > 0.7
        ? 1.4
        : 1.1,
    fillColor:
      getHeatMapColor(
        intensity
      ),
    fillOpacity: 0.82
  };
}

function getCountryStyle(foodCount, maximumFoodCount){
  return foodCount > 0 ? getExploredStyle(foodCount, maximumFoodCount) : defaultStyle;
}

// ============================================================
// GET HOVER STYLE
// ============================================================
// Hovering emphasizes the country while preserving its heat-map
// color so the color still communicates food exploration.

function getHoverExploredStyle(foodCount, maximumFoodCount) {
  const intensity =
    getCountryIntensity(
      foodCount,
      maximumFoodCount
    );
  return {
    color:
      heatMapTheme.hoverBorder,
    weight: 2.5,
    fillColor:
      getHeatMapColor(
        intensity
      ),
    fillOpacity: 1
  };
}

// ============================================================
// UNEXPLORED COUNTRY HOVER STYLE
// ============================================================

const hoverUnexploredStyle = {
  color:
    heatMapTheme.hoverBorder,
  weight: 1.5,
  fillColor:
    heatMapTheme.unexplored,
  fillOpacity: 0.75
};

// ============================================================
// COUNTRY DATA
// ============================================================

const countryLayers = new Map();

// ============================================================
// REGION DATA
// ============================================================

const regionLayers = new Map();

// ============================================================
// GET FOODS FOR A REGION
// ============================================================


function getRegionAndDescendantIDs(regionID) {
  if (regionID === null || regionID === undefined) {
    return new Set();
  }

  const includedIDs = new Set([String(regionID)]);
  const pendingIDs = [String(regionID)];

  while (pendingIDs.length > 0) {
    const parentID = pendingIDs.shift();

    regions.forEach(region => {
      const id = String(region.id);
      const regionParentID = region.parentRegionID;

      if (
        regionParentID !== null &&
        regionParentID !== undefined &&
        String(regionParentID) === parentID &&
        !includedIDs.has(id)
      ) {
        includedIDs.add(id);
        pendingIDs.push(id);
      }
    });
  }

  return includedIDs;
}

function experiencesForRegion(regionID) {
  if (regionID === null || regionID === undefined) {
    return [];
  }

  // Only include foods assigned directly to this region.
  // Parent regions do not inherit foods from their descendants.
  return experiences.filter(experience =>
    String(experience.region?.id) === String(regionID)
  );
}

function getRegionFoodCount(regionID) {
  return experiencesForRegion(regionID).length;
}

function getGeoJSONArea(geometry) {
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch {
          return 0;
        }
      }

      if (!geometry?.coordinates) {
        return 0;
      }

      const earthRadius = 6371008.8;
      const radians = Math.PI / 180;

      function getRingArea(ring) {
        let total = 0;

        for (let i = 0; i < ring.length - 1; i++) {
          const [lon1, lat1] = ring[i];
          const [lon2, lat2] = ring[i + 1];

          let deltaLon = (lon2 - lon1) * radians;

          // Handle polygons crossing the antimeridian.
          if (deltaLon > Math.PI) deltaLon -= 2 * Math.PI;
          if (deltaLon < -Math.PI) deltaLon += 2 * Math.PI;

          total += deltaLon * (
            2 +
            Math.sin(lat1 * radians) +
            Math.sin(lat2 * radians)
          );
        }

        return Math.abs(total * earthRadius * earthRadius / 2);
      }

      function getPolygonArea(rings) {
        if (!rings?.length) return 0;

        const outerArea = getRingArea(rings[0]);
        const holeArea = rings
          .slice(1)
          .reduce((sum, ring) => sum + getRingArea(ring), 0);

        return Math.max(0, outerArea - holeArea);
      }

      switch (geometry.type) {
        case "Polygon":
          return getPolygonArea(geometry.coordinates);

        case "MultiPolygon":
          return geometry.coordinates.reduce(
            (sum, polygon) => sum + getPolygonArea(polygon),
            0
          );

        default:
          return 0;
      }
    }

function drawRegionLayers() {
  // Keep only the newest geometry record for each region.
  const newestGeometryByRegion = new Map();

  regionGeometry.forEach(record => {
    if (
      record.regionID === null ||
      record.regionID === undefined ||
      !record.geometry
    ) {
      return;
    }

    const regionID = String(record.regionID);
    const existing = newestGeometryByRegion.get(regionID);

    const recordTime = Date.parse(record.updatedAt || "") || 0;
    const existingTime = existing
      ? Date.parse(existing.updatedAt || "") || 0
      : -1;

    if (!existing || recordTime >= existingTime) {
      newestGeometryByRegion.set(regionID, record);
    }
  });

  // Clear any existing region overlays before drawing again.
  regionLayers.forEach(layer => map.removeLayer(layer));
  regionLayers.clear();

  [...newestGeometryByRegion.entries()]
    .sort(([, recordA], [, recordB]) =>
      getGeoJSONArea(recordB.geometry) -
      getGeoJSONArea(recordA.geometry)
    )
    .forEach(([regionID, record]) => {
    const region = regions.find(
      item => String(item.id) === regionID
    );

    if (!region) {
      return;
    }

    // Country boundaries come from the world map GeoJSON.
    // Only draw custom geometry for non-country regions.
    if (
      String(region.type).trim().toLowerCase() === "country"
    ) {
      console.log("Skipping country custom geometry:", region.name);
      return;
    }

    console.log("Drawing custom region:", region.name, region.type);

    // Count foods assigned to this region and its descendants.
    const foodCount = getRegionFoodCount(regionID);

    if (foodCount === 0) {
      return;
    }

    try {
      const geometry =
        typeof record.geometry === "string"
          ? JSON.parse(record.geometry)
          : record.geometry;

      if (!geometry || !geometry.type || !geometry.coordinates) {
        console.warn(
          "Invalid geometry for region:",
          region.name
        );
        return;
      }

      const feature = {
        type: "Feature",
        properties: {
          regionID,
          regionName: region.name
        },
        geometry
      };

      const regionLayer = L.geoJSON(feature, {
        pane: "regionPane",

        style: () =>
          getExploredStyle(
            foodCount,
            maximumFoodCount
          ),

        onEachFeature: (_feature, layer) => {
          layer.bindTooltip(
            `
              <div class="country-tooltip-content">
                <strong>${region.name}</strong>
                <span class="tooltip-count">
                  ${foodCount}
                  ${foodCount === 1 ? "food" : "foods"} explored
                </span>
              </div>
            `,
            {
              sticky: true,
              className: "country-tooltip"
            }
          );

          layer.on("mouseover", event => {
            event.target.setStyle(
              getHoverExploredStyle(
                foodCount,
                maximumFoodCount
              )
            );
//            event.target.bringToFront();
          });

          layer.on("mouseout", event => {
            event.target.setStyle(
              getExploredStyle(
                foodCount,
                maximumFoodCount
              )
            );
          });
          layer.on("click", event => {
            L.DomEvent.stopPropagation(event.originalEvent);
            openRegionFoods(region.name);
          });
        }
      }).addTo(map);

      regionLayers.set(regionID, regionLayer);
    } catch (error) {
      console.error(
        `Could not draw region "${region.name}":`,
        error
      );
    }
  });

  console.log(
    `Drew ${regionLayers.size} explored region overlays.`
  );
}


// ============================================================
// NORMALIZE COUNTRY CODE
// ============================================================

function normalizeCountryCode(code) {
  if (!code) {
    return "";
  }
  return String(code)
    .trim()
    .toUpperCase();
}

// ============================================================
// GET COUNTRY CODE FROM GEOJSON
// ============================================================

function getCountryCode(feature) {
  const properties =
    feature.properties || {};
  const possibleCodes = [
    properties["ISO3166-1-Alpha-3"],
    properties.ISO_A3,
    properties.iso_a3,
    properties.ADM0_A3,
    properties.adm0_a3,
    properties.SOV_A3,
    properties.sov_a3,
    properties.ISO_A3_EH,
    properties.iso_a3_eh
  ];

  for (const code of possibleCodes) {
    const normalizedCode =
      normalizeCountryCode(code);
    if (
      normalizedCode &&
      normalizedCode !== "-99"
    ) {
      return normalizedCode;
    }
  }

  return null;
}

// ============================================================
// GET COUNTRY NAME
// ============================================================

function getCountryName(feature) {
  const properties =
    feature.properties || {};
  return (
    properties.name ||
    properties.NAME ||
    properties.ADMIN ||
    properties.NAME_LONG ||
    properties.name_long ||
    "Unknown"
  );
}

// ============================================================
// GET FOODS FOR A COUNTRY
// ============================================================

function experiencesForCountry(countryCode) {
  const normalizedCode =
    normalizeCountryCode(
      countryCode
    );
  if (!normalizedCode) {
    return [];
  }
  return experiences.filter(
    experience => {
      const countryCodes =
        String(
            experience.countryCode || ""
        )
        .split(",")
        .map(code => normalizeCountryCode(code)
        )
        .filter(Boolean);
      return countryCodes.includes(normalizedCode);
    }
  );
}

// Foods count toward a country on the initial map only when the
// food's assigned region is that country itself. A regional food
// such as Dosa assigned to Southern India won't color India too.
function experiencesForCountryRegion(countryCode) {
  const normalizedCode = normalizeCountryCode(countryCode);

  if (!normalizedCode) {
    return [];
  }

  return experiences.filter(experience =>
    String(experience.region?.type || "").trim().toLowerCase() === "country" &&
    String(experience.countryCode || "")
      .split(",")
      .map(code => normalizeCountryCode(code))
      .includes(normalizedCode)
  );
}

// ============================================================
// LOAD WORLD MAP
// ============================================================
//Let's make the rule:
//  - Country regions use the existing world map's country geometry.
//  - Subregion, City, and geographic/cultural regions can use custom geometry.
//  - Food records still count toward the appropriate country and region totals.

async function loadWorldMap() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    );
    if (!response.ok) {
      throw new Error(
        "Could not load country map data."
      );
    }
    const data = await response.json();
    console.log(
      "World map loaded:",
      data.features.length,
      "countries"
    );
    map.createPane("countryPane");
    map.getPane("countryPane").style.zIndex = 400;

    map.createPane("regionPane");
    map.getPane("regionPane").style.zIndex = 410;

    L.geoJSON(
      data,
      {
        pane: "countryPane",
        style: feature => {
          const countryCode = getCountryCode(feature);
          const foods = experiencesForCountryRegion(countryCode);
          return foods.length > 0
            ? getExploredStyle(
                foods.length,
                maximumFoodCount
              )
            : defaultStyle;
        },
        onEachFeature: (feature, layer) => {
          const countryCode = getCountryCode(feature);
          const countryName = getCountryName(feature);
          const foods = experiencesForCountryRegion(countryCode);
          const foodCount = foods.length;
          if (countryCode) {
            countryLayers.set(countryCode, layer);
          }
          if (foodCount > 0) {
            const foodLabel =
              foodCount === 1
                ? "food explored"
                : "foods explored";
            const foodNames = foods
              .map(food => food.dish)
              .join(" · ");
            layer.bindTooltip(
              `
                <div class="country-tooltip-content">
                  <strong>${countryName}</strong>
                  <span class="tooltip-count">
                    ${foodCount}
                    ${foodLabel}
                  </span>
                  <span class="tooltip-foods">
                    ${foodNames}
                  </span>
                </div>
              `,
              {
                sticky: true,
                className: "country-tooltip"
              }
            );
          } else {
            layer.bindTooltip(
              `
                <div class="country-tooltip-content">
                  <strong>${countryName}</strong>
                  <span class="tooltip-unexplored">
                    Not explored yet
                  </span>
                </div>
              `,
              {
                sticky: true,
                className: "country-tooltip"
              }
            );
          }
          layer.on("mouseover", event => {
            if (foodCount > 0) {
              const hoverStyle =
                getHoverExploredStyle(
                  foodCount,
                  maximumFoodCount
                );
              event.target.setStyle(hoverStyle);
            } else {
              event.target.setStyle(
                hoverUnexploredStyle
              );
            }
            if (
              !L.Browser.ie &&
              !L.Browser.opera &&
              !L.Browser.edge
            ) {
              event.target.bringToFront();
            }
          });
          layer.on("mouseout", event => {
            if (foodCount > 0) {
              const styleTile =
                getCountryStyle(
                  foodCount,
                  maximumFoodCount
                );
              event.target.setStyle(styleTile);
            } else {
              event.target.setStyle(defaultStyle);
            }
          });
          layer.on("click", () => {
            if (foodCount > 0) {
              showCountryJournal(
                countryName,
                countryCode
              );
            } else {
              showUnexploredCountry(
                countryName
              );
            }
          });
        }
      }

    ).addTo(map);

    drawRegionLayers();

    // Keep region polygons above country polygons.
//    regionLayers.forEach(layer => {
//      layer.bringToFront();
//    });

    console.log(
      "Countries represented in our food journey:"
    );
    experiences.forEach(experience => {
      console.log(
        experience.dish,
        "→",
        experience.countryCode
      );
    });
  } catch (error) {
    console.error(
      "Could not load world map:",
      error
    );
    document
      .getElementById("map")
      .insertAdjacentHTML(
        "beforeend",
        `
          <div
            style="
              position:absolute;
              z-index:1000;
              top:20px;
              left:20px;
              padding:20px;
              background:white;
              border-radius:10px;
              box-shadow:0 2px 5px rgba(0,0,0,0.2);
            "
          >
            The country map data could not be loaded.
          </div>
        `
      );
  }
}
// ============================================================
// COUNTRY JOURNAL
// ============================================================

function showCountryJournal(countryName, countryCode) {
  const foods =
    experiencesForCountry(
      countryCode
    );
  // Get unique cuisines
  const cuisines =
    [
      ...new Set(
        foods.map(
          food => food.cuisine?.id
        )
      )
    ];
  const foodList =
    foods
      .map(
        food => {
          return `
            <button
              class="food-entry-button"
              data-id="${food.id}"
            >
              <span class="food-entry-emoji">🍽</span>
              <span class="food-entry-info">
                <strong>
                  ${food.dish}
                </strong>
                <small>
                  ${food.cuisine?.name}
                </small>
              </span>
            </button>
          `;
        }
      )
      .join("");
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <p class="entry-kicker">
      OUR FOOD JOURNEY
    </p>
    <h2 class="entry-title">
      🌎 ${countryName}
    </h2>
    <p class="entry-meta">
      ${foods.length}
      ${foods.length === 1
        ? "food"
        : "foods"}
      explored
      ·
      ${cuisines.length}
      ${cuisines.length === 1
        ? "cuisine"
        : "cuisines"}
    </p>
    <div class="country-summary">
      <p>
        These are the foods from this part of the
        world that we've explored so far.
      </p>
    </div>
    <div class="food-list">
      ${foodList}
    </div>
  `;
  // Connect food buttons
  document
    .querySelectorAll(
      ".food-entry-button"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () => {
            openJournal(
              button.dataset.id
            );
          }
        );
      }
    );
  openModal();
}

// ============================================================
// UNEXPLORED COUNTRY
// ============================================================

function showUnexploredCountry(countryName) {
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <p class="entry-kicker">
      NOT EXPLORED YET
    </p>
    <h2 class="entry-title">
      🌎 ${countryName}
    </h2>
    <p class="entry-meta">
      We haven't recorded any foods from here yet.
    </p>
    <div class="country-summary">
      <p>
        Maybe this is somewhere our food journey
        will take us someday.
      </p>
    </div>
  `;
  openModal();
}

// ============================================================
// FOOD JOURNAL ENTRY
// ============================================================

function openJournal(id) {
  const item =
    experiences.find(
      experience =>
        experience.id === id
    );
  if (!item) {
    return;
  }
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <p class="entry-kicker">
      ${item.cuisine?.name}
      ·
      ${item.region?.name}
    </p>
    <h2 class="entry-title">
      ${item.dish}
    </h2>
    <p class="entry-meta">
      ${item.date}
    </p>
    <div class="entry-photo">
      ${
        item.photo?.url
          ? `<img src="${item.photo.url}" alt="${item.dish}">`
          : "<span>📷 No photo</span>"
      }
    </div>
    <div class="food-origin-box">
      <strong>
        🍽️ About the Food
      </strong>
      <small>
        Region: ${item.region?.name}
      </small>

      <p>
        ${item.aboutFood || ""}
      </p>
    </div>
    <div class="journal-grid">
      <section class="note">
        <h3>
          ${item.person1.name}'s thoughts
        </h3>
        <p>
          ${item.person1.thoughts}
        </p>
        <p
          class="rating"
          style="margin-top:12px"
        >
          ${stars(item.person1.rating)}
        </p>
      </section>
      <section class="note">
        <h3>
          ${item.person2.name}'s thoughts
        </h3>
        <p>
          ${item.person2.thoughts}
        </p>
        <p
          class="rating"
          style="margin-top:12px"
        >
          ${stars(item.person2.rating)}
        </p>
      </section>
    </div>
    <section class="restaurant-box">
    <p class="entry-kicker">
      WHERE WE EXPERIENCED IT
    </p>
    <h3>
      📍 ${item.restaurant.name}
    </h3>
    <p>
      ${item.restaurant.address}
    </p>
    <p>
      ${item.restaurant.city}
    </p>
    <p>
      ${item.restaurant.phone}
    </p>
    ${
      item.restaurant.website
        ? `
          <p>
            <a
              href="${item.restaurant.website}"
              target="_blank"
              rel="noopener"
            >
              Restaurant website ↗
            </a>
          </p>
        `
        : ""
    }
    <p>
      <strong>
        Rating
      </strong>
      ${stars(item.restaurant.combinedRating)}
      ${item.restaurant.combinedRating ?? "Not rated"}
    </p>
    <section class="note" style="padding:15px">
      <div class="review-grid">

        <div class="review-person">
          <p>
            <strong>
              Would Cris go back?
            </strong>
            <span>
              ${
                item.restaurant.cristyleGoBack === true
                  ? "Yes! ❤️"
                  : item.restaurant.cristyleGoBack === false
                    ? "No 🙅🏽"
                    : "Maybe 🤔"
              }
            </span>
          </p>

          <p>
            <strong>
              Would Cris have it again?
            </strong>
            <span>
              ${
                item.person1.haveAgain === true
                  ? "Absolutely!! 😋"
                  : item.person1.haveAgain === false
                    ? "Nope! 🤢"
                    : "Probably not 🤷🏽"
              }
            </span>
          </p>
        </div>

        <div class="review-person">
          <p>
            <strong>
              Would Danni go back?
            </strong>
            <span>
              ${
                item.restaurant.danniGoBack === true
                  ? "Yes ❤️"
                  : item.restaurant.danniGoBack === false
                    ? "No"
                    : "Not sure yet"
              }
            </span>
          </p>

          <p>
            <strong>
              Would Danni have it again?
            </strong>
            <span>
              ${
                item.person2.haveAgain === true
                  ? "Absolutely"
                  : item.person2.haveAgain === false
                    ? "Probably not"
                    : "Not sure yet"
              }
            </span>
          </p>
        </div>

      </div>
    </section>
  `;
  openModal();
}

// ============================================================
// STAR RATINGS
// ============================================================

function stars(value) {

  const full =
    Math.floor(value);
  const half =
    value % 1 !== 0;
  return (
    "★".repeat(full) +
    (half ? "½" : "") +
    "☆".repeat(
      5 -
      full -
      (half ? 1 : 0)
    )
  );
}

// ============================================================
// MODAL
// ============================================================

function openModal() {
  document.getElementById(
    "modalBackdrop"
  ).hidden = false;
}

function closeModal() {
  document.getElementById(
    "modalBackdrop"
  ).hidden = true;
}

document
  .getElementById(
    "closeModal"
  )
  .addEventListener(
    "click",
    closeModal
  );

document
  .getElementById(
    "modalBackdrop"
  )
  .addEventListener(
    "click",
    event => {
      if (
        event.target.id ===
        "modalBackdrop"
      ) {
        closeModal();
      }
    }
  );

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape"
    ) {
      closeModal();
    }
  }
);

// ============================================================
// RESET MAP
// ============================================================

document
  .getElementById(
    "resetMap"
  )
  .addEventListener(
    "click",
    () => {
      map.setView(
        [25, 0],
        2
      );
    }
  );

// ============================================================
// STATISTICS
// ============================================================

function updateStatistics() {
  const uniqueCountries =
    new Set(
      experiences.map(
        experience =>
          experience.countryCode
      )
    );
  const uniqueRegions =
    new Set(
      experiences.map(
        experience =>
          experience.region?.id
      )
    );
  const uniqueCuisines =
    new Set(
      experiences.map(
        experience =>
          experience.cuisine?.id
      )
    );
  document.getElementById("stats").innerHTML = `
    <div
      class="stat stat-clickable"
      id="foodsStat"
      role="button"
      tabindex="0"
    >
      <span class="stat-number">${experiences.length}</span>
      <span class="stat-label">Foods Tried</span>
    </div>
  <div
    class="stat stat-clickable"
    id="countriesStat"
    role="button"
    tabindex="0"
  >
    <span class="stat-number">${uniqueCountries.size}</span>
    <span class="stat-label">Countries</span>
  </div>
    <div
      class="stat stat-clickable"
      id="regionsStat"
      role="button"
      tabindex="0"
    >
      <span class="stat-number">${uniqueRegions.size}</span>
      <span class="stat-label">Regions</span>
    </div>
    <div class="stat">
      <span class="stat-number">${uniqueCuisines.size}</span>
      <span class="stat-label">Cuisines</span>
    </div>
  `;
  document
    .getElementById("foodsStat")
    .addEventListener("click", openFoodExplorer);
  document
    .getElementById("countriesStat")
    .addEventListener("click", openCountryExplorer);
    document
      .getElementById("regionsStat")
      .addEventListener("click", openRegionExplorer);
}

// ============================================================
// FOOD EXPLORER
// ============================================================

function centerMapOnCountry(countryCode) {
  const normalizedCode =
    normalizeCountryCode(countryCode);
  const layer =
    countryLayers.get(normalizedCode);
  if (!layer) {
    console.warn(
      "Could not find map layer for:",
      countryCode
    );
    return;
  }
  const bounds =
    layer.getBounds();
  map.fitBounds(bounds, {
    padding: [40, 40],
    maxZoom: 5
  });
}

function openFoodExplorer() {
  const sortedExperiences =
    [...experiences].sort(
      (a, b) =>
        a.dish.localeCompare(b.dish)
    );
  const foodList =
    sortedExperiences
      .map(
        experience => `
          <button
            class="explorer-item"
            data-food-id="${experience.id}"
          >
            <span class="explorer-item-name">
              ${experience.dish}
            </span>
            <span class="explorer-item-details">
              ·
              ${experience.region?.name}
            </span>
          </button>
        `
      )
      .join("");
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <div class="explorer">
      <p class="entry-kicker">
        OUR FOOD JOURNEY
      </p>
      <h2>
        🍜 Foods We've Tried
      </h2>
      <p class="explorer-intro">
        We've explored
        ${experiences.length}
        different foods so far.
      </p>
      <div class="explorer-list">
        ${foodList}
      </div>
    </div>
  `;
  openModal();
  document
    .querySelectorAll(".explorer-item")
    .forEach(item => {
      item.addEventListener("click", () => {
        const foodId =
          item.dataset.foodId;
        const experience =
          experiences.find(
            experience =>
              String(experience.id) ===
              String(foodId)
          );
        if (!experience) {
          console.error(
            "Food not found:",
            foodId
          );
          return;
        }
        console.log(
          "Selected food:",
          experience
        );
        closeModal();
        centerMapOnCountry(
          experience.countryCode
        );
      });
    });
}

// ============================================================
// COUNTRY EXPLORER
// ============================================================

function openCountryExplorer() {

  const countryMap = new Map();

  experiences.forEach(experience => {

    const countryCodes =
      String(
        experience.countryCode || ""
      )
        .split(",")
        .map(code =>
          normalizeCountryCode(code)
        )
        .filter(Boolean);

    countryCodes.forEach(countryCode => {

      if (!countryMap.has(countryCode)) {

        const layer =
          countryLayers.get(countryCode);

        countryMap.set(countryCode, {
          code: countryCode,
          name: layer
            ? getCountryName(layer.feature)
            : countryCode,
          foodCount: 0
        });

      }

      countryMap.get(countryCode).foodCount++;

    });

  });

  const countries =
    [...countryMap.values()]
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

  const countryList =
    countries
      .map(country => `
        <button
          class="explorer-item"
          data-country-code="${country.code}"
        >
          <span class="explorer-item-name">
            ${country.name}
          </span>
          <span class="explorer-item-details">
            ${country.foodCount}
            ${country.foodCount === 1 ? "food" : "foods"}
          </span>
        </button>
      `)
      .join("");

  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <div class="explorer">
      <p class="entry-kicker">
        OUR FOOD JOURNEY
      </p>
      <h2>
        🌎 Countries We've Explored
      </h2>
      <p class="explorer-intro">
        We've explored
        ${countries.length}
        countries so far.
      </p>
      <div class="explorer-list">
        ${countryList}
      </div>
    </div>
  `;

  openModal();

  document
    .querySelectorAll(".explorer-item")
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const countryCode =
            item.dataset.countryCode;

          console.log(
            "Selected country:",
            countryCode
          );

          closeModal();

          centerMapOnCountry(
            countryCode
          );

        }
      );

    });

}

// ============================================================
// REGIONS EXPLORER
// ============================================================

function openRegionExplorer() {
  const regionMap = new Map();
  experiences.forEach(experience => {
    const region =
      experience.region?.name;
    if (!region) {
      return;
    }
    if (!regionMap.has(region)) {
      regionMap.set(region, {
        name: region,
        foodCount: 0,
        countries: new Set()
      });
    }
    const regionData =
      regionMap.get(region);
    regionData.foodCount++;
    const countryCode =
      normalizeCountryCode(
        experience.countryCode
      );
    if (countryCode) {
      regionData.countries.add(
        countryCode
      );
    }
  });
  const regions =
    [...regionMap.values()]
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  const regionList =
    regions
      .map(region => `
        <button
          class="explorer-item"
          data-region="${region.name}"
        >
          <span class="explorer-item-name">
            ${region.name}
          </span>
          <span class="explorer-item-details">
            ·
            ${region.foodCount}
            ${region.foodCount === 1
              ? "food"
              : "foods"}
          </span>
        </button>
      `)
      .join("");
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <div class="explorer">
      <p class="entry-kicker">
        OUR FOOD JOURNEY
      </p>
      <h2>
        🗺️ Regions We've Explored
      </h2>
      <p class="explorer-intro">
        We've explored
        ${regions.length}
        regions so far.
      </p>
      <div class="explorer-list">
        ${regionList}
      </div>
    </div>
  `;
  openModal();
  document
    .querySelectorAll(".explorer-item")
    .forEach(item => {
      item.addEventListener(
        "click",
        () => {
          const regionName =
            item.dataset.region;
          console.log(
            "Selected region:",
            regionName
          );
          closeModal();
          openRegionFoods(
            regionName
          );
        }
      );
    });
}

function openRegionFoods(regionName) {
  const selectedRegion = regions.find(
    region => region.name === regionName
  );
  const regionExperiences = (
    selectedRegion
      ? experiencesForRegion(selectedRegion.id)
      : experiences.filter(
          experience => experience.region?.name === regionName
        )
  ).sort((a, b) => a.dish.localeCompare(b.dish));

  const foodList =
    regionExperiences
      .map(experience => `
        <button
          class="explorer-item"
          data-food-id="${experience.id}"
        >
          <span class="explorer-item-name">
            ${experience.dish}
          </span>
          <span class="explorer-item-details">
            ·
            ${experience.cuisine?.name}
          </span>
        </button>
      `)
      .join("");
  document.getElementById(
    "modalContent"
  ).innerHTML = `
    <div class="explorer">
      <p class="entry-kicker">
        ${regionName}
      </p>
      <h2>
        🍜 Foods We've Tried
      </h2>
      <p class="explorer-intro">
        We've tried
        ${regionExperiences.length}
        ${regionExperiences.length === 1
          ? "food"
          : "foods"}
        from this region.
      </p>
      <div class="explorer-list">
        ${foodList}
      </div>
    </div>
  `;
  openModal();
  document
    .querySelectorAll(".explorer-item")
    .forEach(item => {
      item.addEventListener(
        "click",
        () => {
          const foodId =
            item.dataset.foodId;
          const experience =
            experiences.find(
              experience =>
                String(experience.id) ===
                String(foodId)
            );
          if (!experience) {
            console.error(
              "Food not found:",
              foodId
            );
            return;
          }
          console.log(
            "Selected regional food:",
            experience
          );
          closeModal();
          centerMapOnCountry(
            experience.countryCode
          );
        }
      );
    });
}

// ============================================================

async function initializeApp() {
  await loadExperiences();
  maximumFoodCount =
    getMaximumFoodCount(experiences);
  console.log(
    "Maximum food count:",
    maximumFoodCount
  );
  updateStatistics();
  await loadWorldMap();
}
initializeApp();