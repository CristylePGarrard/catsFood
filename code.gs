const FOOD_SHEET_NAME = "food";
const LOCATION_SHEET_NAME = "location";
const CUISINE_SHEET_NAME = "cuisines";
const REGION_SHEET_NAME = "regions";
const REGION_GEOMETRY_SHEET_NAME = "regionGeometry";

/**
 * Main API endpoint.
 *
 * Returns all food experiences as JSON.
 */
function doGet() {
  try {
    const spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();
    const foodSheet =
      spreadsheet.getSheetByName(FOOD_SHEET_NAME);
    const locationSheet =
      spreadsheet.getSheetByName(LOCATION_SHEET_NAME);
    const cuisineSheet =
      spreadsheet.getSheetByName(CUISINE_SHEET_NAME);
    const regionSheet =
      spreadsheet.getSheetByName(REGION_SHEET_NAME);
    const regionGeometrySheet =
      spreadsheet.getSheetByName(REGION_GEOMETRY_SHEET_NAME);

    if (!foodSheet) {
      throw new Error(
        `Could not find sheet: ${FOOD_SHEET_NAME}`
      );
    }

    if (!locationSheet) {
      throw new Error(
        `Could not find sheet: ${LOCATION_SHEET_NAME}`
      );
    }

    if (!cuisineSheet) {
      throw new Error(
        `Could not find sheet: ${CUISINE_SHEET_NAME}`
      );
    }

    if (!regionSheet) {
     throw new Error(
      `Could not find sheet: ${REGION_SHEET_NAME}`
      );
    }

      if (!regionGeometrySheet) {
     throw new Error(
      `Could not find sheet: ${REGION_GEOMETRY_SHEET_NAME}`
      );
    }

    const foods =
      sheetToObjects(foodSheet);
    const locations =
      sheetToObjects(locationSheet);
    const cuisines =
      sheetToObjects(cuisineSheet);
    const regions =
      sheetToObjects(regionSheet);
    const regionGeometry =
      sheetToObjects(regionGeometrySheet);
    /*
     * Turn locations into a lookup object.
     *
     * Example:
     *
     * locationsById["12"]
     *
     * gives us the location with id 12.
     */
    const locationsById = {};
    locations.forEach(location => {
      if (location.id !== "") {
        locationsById[String(location.id)] =
          location;
      }
    });
    const cuisinesById = {};
    cuisines.forEach(cuisine => {
      if (cuisine.id !== "") {
        cuisinesById[String(cuisine.id)] =
          cuisine;
      }
    });
    const regionsById = {};
    regions.forEach(region => {
      if (region.id !== "") {
        regionsById[String(region.id)] =
          region;
      }
    });
    /*
     * Build the JSON structure used by the website.
     */
    const experiences =
      foods
        .filter(food => food.id !== "")
        .map(food => {
          const location =
            locationsById[
              String(food.locationID)
            ] || null;
          const cuisine =
            cuisinesById[
              String(food.cuisinesID)
            ] || null;
          const region =
            regionsById[
              String(food.regionID)
            ] || null;
          return {
            id: String(food.id),
            dish: food.foodName,
            cuisine: cuisine
              ? {
                  id:
                    String(cuisine.id),
                  name:
                    cuisine.cuisineName,
                  type:
                    cuisine.cuisineType,
                  broadRegion:
                    cuisine.broadRegion,
                  primaryCountryArea:
                    cuisine.primaryCountryArea,
                  countryCodes:
                    String(cuisine.countryCodes || "")
                      .split(",")
                      .map(code =>
                        normalizeCountryCode(code)
                      )
                      .filter(Boolean)
                }
              : null,
            region: region
              ? {
                  id:
                    String(region.id),
                  name:
                    region.regionName,
                  type:
                    region.regionType,
                  parentRegionID:
                    region.parentRegionID === ""
                      ? null
                      : String(region.parentRegionID),
                  mapKey:
                    region.mapKey
                }
              : null,
            countryCode:
              normalizeCountryCode(
                food.countryCode
              ),
            date:
              formatDate(food.foodDate),
            photo:
              food.photoFileID
                ? {
                    fileID:
                      String(food.photoFileID),
                    url:
                      `https://drive.google.com/thumbnail?id=${String(food.photoFileID)}&sz=w800`
                  }
                : null,
            person1: {
              name: "Cristyle",
              thoughts:
                food.cristylesThoughts,
              rating:
                toNumber(
                  food.cristylesRating
                ),
              haveAgain:
                yesNoToBoolean(
                  food.cristyleHaveAgain
                )
            },
            person2: {
              name: "Danni",
              thoughts:
                food.dannisThoughts,
              rating:
                toNumber(
                  food.dannisRating
                ),
              haveAgain:
                yesNoToBoolean(
                  food.danniHaveAgain
                )
            },
            aboutFood:
              food.aboutFood,
            restaurant: location
              ? {
                  name:
                    location.resturauntName,
                  city:
                    location.resturauntCity,
                  address:
                    location.resturauntAddress,
                  phone:
                    location.resturauntPhone,
                  website:
                    location.resturauntWebsite,
                  combinedRating:
                    toNumber(
                      location.combinedRating
                    ),
                  cristyleGoBack:
                    yesNoToBoolean(
                      location.crisGoBack
                    ),
                  danniGoBack:
                    yesNoToBoolean(
                      location.danniGoBack
                    )
                }
              : null
          };
        });
    return jsonResponse({
      success: true,
      experiences: experiences,
      regions: regions.map(region => ({
        id: String(region.id),
        name: region.regionName,
        type: region.regionType,
        parentRegionID:
          region.parentRegionID === ""
            ? null
            : String(region.parentRegionID),
        mapKey: region.mapKey
      })),
      regionGeometry: regionGeometry.map(geometry => ({
        id: String(geometry.id),
        regionID: String(geometry.regionID),
        geometry: geometry.geometry,
        geometryType: geometry.geometryType,
        source: geometry.source,
        createdAt: geometry.createdAt,
        updatedAt: geometry.updatedAt,
        notes: geometry.notes
      })),
      count: experiences.length
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}
/**
 * Convert a Google Sheet into an array of objects.
 *
 * The first row is treated as the column headers.
 */
function sheetToObjects(sheet) {
  const values =
    sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }
  const headers =
    values[0].map(header =>
      String(header).trim()
    );
  return values
    .slice(1)
    .map(row => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] =
          row[index];
      });
      return object;
    });
}
/**
 * Return JSON from the API.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
/**
 * Normalize ISO country codes.
 */
function normalizeCountryCode(code) {
  if (!code) {
    return "";
  }
  return String(code)
    .trim()
    .toUpperCase();
}
/**
 * Convert spreadsheet numbers safely.
 */
function toNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }
  const number =
    Number(value);
  return Number.isNaN(number)
    ? null
    : number;
}
/**
 * Convert Y/N spreadsheet values
 * into JavaScript booleans.
 */
function yesNoToBoolean(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }
  const normalized =
    String(value)
      .trim()
      .toLowerCase();
  if (normalized === "y") {
    return true;
  }
  if (normalized === "n") {
    return false;
  }
  return null;
}
/**
 * Format Google Sheets dates as YYYY-MM-DD.
 */
function formatDate(value) {

  if (!value) {
    return "";
  }
  if (
    Object.prototype.toString
      .call(value) === "[object Date]"
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }
  return String(value);
}