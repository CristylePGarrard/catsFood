# Region Geometry Editor
---

Purpose:
A developer tool for creating geographic geometry associated with the regions in the Foods of the World journal.
Output:
GeoJSON Geometry objects that can be stored in regionGeometry and rendered by Leaflet.


```
Region Geometry Editor
────────────────────────────────────

Region: [ Select a region ▼ ]

┌─────────────────────────────────────┐
│                                     │
│              Leaflet Map            │
│                                     │
│       ✏ Draw region boundary       │
│                                     │
└─────────────────────────────────────┘

[ Clear ]                    [ Save ]

Geometry:
{ GeoJSON preview }
```

```
Developer
    ↓
Geometry Editor
    ↓
select region
    ↓
draw boundary
    ↓
GeoJSON
    ↓
save geometry
    ↓
regionGeometry
```

The editor will eventually produce something like

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-80.1, 25.7],
      [-80.0, 25.7],
      [-80.0, 25.8],
      [-80.1, 25.8],
      [-80.1, 25.7]
    ]
  ]
}
```

That geometry is what Leaflet can later use to render the region

```
regions
────────────────────
id
regionName
regionType
parentRegionID
mapKey


regionGeometry
────────────────────
id
regionID
geometry
geometryType
source
createdAt
updatedAt
notes
```
One region can eventually have multiple geometry records. 
