# NAS Knowledge Graph - Data Model Specification

## Overview

This document provides a comprehensive specification of the data model for the National Airspace System (NAS) Knowledge Graph. The model is designed to support safety analysis, trend identification, and maintenance tracking across NAS equipment, personnel, events, and documentation.

## Architecture

### Core Components

The data model consists of five primary node types and their interconnecting relationships:

1. **Equipment** - NAS operational equipment and systems
2. **Location** - Physical and logical locations within the NAS
3. **Event** - Maintenance events, outages, and incidents
4. **Personnel** - Staff involved in NAS operations and maintenance
5. **Report** - Documentation, analysis, and lessons learned

### Schema Organization

All schemas are stored in `/data/schema/` and follow JSON Schema Draft 2020-12 specification:

- `equipment.schema.json` - Equipment node schema
- `location.schema.json` - Location node schema  
- `event.schema.json` - Event node schema
- `personnel.schema.json` - Personnel node schema
- `report.schema.json` - Report node schema
- `relationship.schema.json` - Relationship record schema
- `graphiti-mapping.json` - Graphiti framework mapping configuration

## Node Types

### Equipment Nodes

**Purpose**: Represents NAS operational equipment including surveillance, navigation, weather, and communication systems.

**ID Pattern**: `EQ######` (e.g., `EQ000001`)

#### Key Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique equipment identifier |
| `name` | string | Yes | Human-readable equipment name |
| `type` | enum | Yes | Specific equipment type (see Equipment Types) |
| `category` | enum | Yes | High-level category (surveillance, navigation, weather, communication) |
| `operationalStatus` | enum | Yes | Current status (operational, maintenance, offline, decommissioned) |
| `location` | string | Yes | Reference to location ID |
| `criticalityLevel` | enum | No | Safety criticality (critical, high, medium, low) |
| `installationDate` | date | No | Installation date |
| `lastServiceDate` | date | No | Last maintenance service date |
| `nextServiceDate` | date | No | Next scheduled service date |

#### Equipment Types

**Surveillance Equipment:**
- `radar_short_range` - Short Range Radar systems
- `radar_long_range` - Long Range Radar systems  
- `radom` - Radar Dome structures

**Navigation Aids:**
- `vor` - VOR (VHF Omnidirectional Range)
- `glide_slope` - Glide Slope systems
- `localizer` - Localizer systems
- `marker_beacon` - Marker Beacon systems

**Weather Systems:**
- `asos` - Automated Surface Observing System
- `awos` - Automated Weather Observing System
- `adas` - Automated Data Acquisition System

**Communication Systems:**
- `tvs` - Terminal Voice Switch
- `vscs` - Voice Switching and Control System
- `tdm_ethernet` - TDM/Ethernet communication lines

#### Example
```json
{
  "id": "EQ000001",
  "name": "ATL Primary Surveillance Radar",
  "type": "radar_long_range",
  "category": "surveillance",
  "operationalStatus": "operational",
  "criticalityLevel": "critical",
  "location": "LOC000001",
  "installationDate": "2018-03-15",
  "lastServiceDate": "2024-01-15",
  "nextServiceDate": "2024-04-15"
}
```

### Location Nodes

**Purpose**: Represents physical and logical locations within the NAS including airports, terminals, and facilities.

**ID Pattern**: `LOC######` (e.g., `LOC000001`)

#### Key Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique location identifier |
| `name` | string | Yes | Location name |
| `type` | enum | Yes | Location type (see Location Types) |
| `coordinates` | object | Yes | Geographic coordinates (lat/lon) |
| `airportCode` | string | No | IATA/ICAO airport code |
| `address` | object | No | Physical address information |
| `regionalDesignation` | enum | No | FAA regional designation |

#### Location Types
- `airport_terminal` - Airport passenger terminals
- `faa_stars_terminal` - FAA STARS radar terminals
- `faa_eram_terminal` - FAA ERAM terminals
- `approach_control` - Approach control facilities
- `tower` - Control tower facilities
- `geographic_location` - General geographic areas
- `maintenance_facility` - Maintenance and repair facilities
- `operations_center` - Operations control centers

#### Example
```json
{
  "id": "LOC000001",
  "name": "Hartsfield-Jackson Atlanta International Airport",
  "type": "airport_terminal",
  "airportCode": "ATL",
  "coordinates": {
    "latitude": 33.6407,
    "longitude": -84.4277,
    "elevation": 1026
  },
  "regionalDesignation": "southern"
}
```

### Event Nodes

**Purpose**: Represents maintenance events, outages, incidents, and operational disruptions.

**ID Pattern**: `EVT######` (e.g., `EVT000001`)

#### Key Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique event identifier |
| `type` | enum | Yes | Event type (see Event Types) |
| `severity` | enum | Yes | Severity level (critical, high, medium, low, informational) |
| `startTime` | datetime | Yes | Event start timestamp |
| `status` | enum | Yes | Current status (open, in_progress, resolved, closed, cancelled, scheduled) |
| `title` | string | No | Brief event title |
| `description` | string | No | Detailed event description |
| `endTime` | datetime | No | Event end timestamp |
| `impactLevel` | enum | No | Operational impact (no_impact, minimal, moderate, significant, severe) |

#### Event Types
- `maintenance_scheduled` - Scheduled maintenance activities
- `maintenance_unscheduled` - Unscheduled maintenance
- `full_outage` - Complete system outages
- `partial_outage` - Partial system outages
- `system_failure` - System failures
- `power_failure` - Power-related failures
- `communication_failure` - Communication system failures
- `weather_related` - Weather-related events
- `equipment_malfunction` - Equipment malfunctions
- `software_issue` - Software-related issues

#### Example
```json
{
  "id": "EVT000001",
  "type": "equipment_malfunction",
  "severity": "high",
  "status": "resolved",
  "title": "Primary Radar System Intermittent Failure",
  "startTime": "2024-01-15T08:30:00Z",
  "endTime": "2024-01-15T12:45:00Z",
  "impactLevel": "significant",
  "affectedEquipment": ["EQ000001"]
}
```

### Personnel Nodes

**Purpose**: Represents staff involved in NAS operations, maintenance, and safety analysis.

**ID Pattern**: `PER######` (e.g., `PER000001`)

#### Key Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique personnel identifier |
| `name` | object | Yes | Name components (first, last, etc.) |
| `role` | enum | Yes | Primary job role (see Personnel Roles) |
| `department` | enum | Yes | Department/organizational unit |
| `status` | enum | Yes | Employment status (active, inactive, leave, training, retired, transferred) |
| `homeLocation` | string | No | Primary assigned location ID |
| `expertiseAreas` | array | No | Technical expertise areas |
| `certifications` | array | No | Professional certifications |

#### Personnel Roles
- `maintenance_technician` - Equipment maintenance technicians
- `senior_maintenance_technician` - Senior maintenance staff
- `maintenance_supervisor` - Maintenance supervisors
- `operations_specialist` - Operations specialists
- `air_traffic_controller` - Air traffic controllers
- `safety_analyst` - Safety analysis specialists
- `quality_assurance_specialist` - QA specialists
- `engineering_technician` - Engineering technicians
- `systems_administrator` - Systems administrators
- `facility_manager` - Facility managers

#### Example
```json
{
  "id": "PER000001",
  "name": {
    "first": "John",
    "last": "Smith"
  },
  "role": "maintenance_technician",
  "department": "maintenance",
  "status": "active",
  "homeLocation": "LOC000001",
  "expertiseAreas": ["radar_systems", "power_systems"]
}
```

### Report Nodes

**Purpose**: Represents documentation, analysis reports, lessons learned, and other knowledge artifacts.

**ID Pattern**: `RPT######` (e.g., `RPT000001`)

#### Key Attributes

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique report identifier |
| `type` | enum | Yes | Report type (see Report Types) |
| `title` | string | Yes | Report title |
| `status` | enum | Yes | Publication status (draft, under_review, approved, published, archived, superseded) |
| `createdBy` | string | Yes | Author personnel ID |
| `createdDate` | date | Yes | Creation date |
| `classification` | enum | No | Security classification (public, internal, restricted, confidential) |
| `summary` | string | No | Executive summary |
| `content` | object | No | Structured report content |

#### Report Types
- `action_report` - Action reports from incidents
- `lessons_learned` - Lessons learned documents
- `incident_analysis` - Incident analysis reports
- `safety_assessment` - Safety assessments
- `maintenance_summary` - Maintenance summary reports
- `trend_analysis` - Trend analysis reports
- `performance_review` - Performance reviews
- `inspection_report` - Inspection reports
- `technical_evaluation` - Technical evaluations
- `risk_assessment` - Risk assessment reports

#### Example
```json
{
  "id": "RPT000001",
  "type": "incident_analysis",
  "title": "Analysis of ATL Primary Radar Failure - January 2024",
  "status": "published",
  "createdBy": "PER000002",
  "createdDate": "2024-01-20",
  "classification": "internal",
  "relatedEvents": ["EVT000001"],
  "relatedEquipment": ["EQ000001"]
}
```

## Relationship Types

Relationships connect nodes in the knowledge graph, enabling complex queries and analysis across the data model.

### Core Relationship Types

| Relationship | Source → Target | Description | Cardinality |
|-------------|----------------|-------------|-------------|
| `LOCATED_AT` | Equipment → Location | Equipment is installed at location | Many-to-One |
| `ASSIGNED_TO` | Personnel → Event | Personnel assigned to handle event | Many-to-Many |
| `EXPERIENCED_OUTAGE` | Equipment → Event | Equipment experienced outage/event | Many-to-Many |
| `GENERATED_REPORT` | Event → Report | Event generated documentation | One-to-Many |
| `CONTAINS_LESSONS` | Report → Report | Report contains lessons from other report | Many-to-Many |
| `DEPENDS_ON` | Equipment → Equipment | Equipment dependency relationship | Many-to-Many |
| `MAINTAINS` | Personnel → Equipment | Personnel responsible for equipment | Many-to-Many |
| `SUPERVISES` | Personnel → Personnel | Supervisory relationship | Many-to-Many |
| `WORKS_AT` | Personnel → Location | Personnel assigned to location | Many-to-Many |
| `AUTHORED` | Personnel → Report | Personnel authored report | Many-to-Many |
| `REVIEWED` | Personnel → Report | Personnel reviewed report | Many-to-Many |
| `APPROVED` | Personnel → Report | Personnel approved report | Many-to-Many |

### Relationship Schema

Each relationship record includes:

- `sourceId` - Source node ID
- `targetId` - Target node ID  
- `type` - Relationship type
- `direction` - Directed or undirected
- `weight` - Relationship strength (0-1)
- `properties` - Type-specific properties
- `context` - Contextual information
- `validation` - Validation metadata

#### Example
```json
{
  "sourceId": "EQ000001",
  "targetId": "LOC000001",
  "type": "LOCATED_AT",
  "direction": "directed",
  "weight": 1.0,
  "properties": {
    "startDate": "2018-03-15T00:00:00Z",
    "frequency": "continuous"
  },
  "context": {
    "description": "Primary radar system located at ATL terminal",
    "category": "operational"
  }
}
```

## Graphiti Integration

### Entity Mapping

The data model maps to Graphiti framework constructs as follows:

- **Nodes** → Graphiti Entities with type-specific schemas
- **Relationships** → Graphiti Edges with directional properties
- **Attributes** → Indexed and searchable entity properties
- **Content** → Vector embeddings for semantic search

### Key Features

1. **Type Safety** - All nodes validated against JSON schemas
2. **Semantic Search** - Vector embeddings on text content
3. **Temporal Queries** - Time-based relationship analysis
4. **Geospatial Queries** - Location-based analysis
5. **Graph Traversal** - Complex path finding and clustering

### Configuration

Graphiti mapping configuration stored in `graphiti-mapping.json` includes:

- Node type mappings to entities
- Relationship type mappings to edges
- Indexing configuration
- Embedding model settings
- Query capability flags

## Usage Patterns

### Common Query Patterns

1. **Equipment Health**: Find all events for equipment at a location
2. **Personnel Workload**: Find all events assigned to personnel
3. **Incident Analysis**: Trace relationships from event to reports
4. **Dependency Analysis**: Find equipment dependencies and impact
5. **Trend Analysis**: Temporal analysis of events by type/severity
6. **Geographic Analysis**: Spatial clustering of incidents

### Example Queries

**Find all equipment at a location:**
```cypher
MATCH (e:Equipment)-[:LOCATED_AT]->(l:Location {id: 'LOC000001'})
RETURN e
```

**Find maintenance events for radar systems:**
```cypher
MATCH (eq:Equipment {category: 'surveillance'})-[:EXPERIENCED_OUTAGE]->(ev:Event)
WHERE ev.type STARTS WITH 'maintenance'
RETURN eq, ev
```

**Find reports generated from critical events:**
```cypher
MATCH (ev:Event {severity: 'critical'})-[:GENERATED_REPORT]->(r:Report)
RETURN ev, r
```

## Validation Rules

### Schema Validation
- All nodes must conform to their JSON schema
- Required fields must be present
- Data types must match schema definitions
- Enum values must be from allowed lists

### Referential Integrity
- Relationship source/target IDs must exist
- Location references must point to valid locations
- Personnel references must point to active personnel
- Cross-references must be bidirectional where appropriate

### Business Rules
- Equipment cannot be at multiple locations simultaneously
- Events must have valid start/end time sequences
- Personnel cannot be assigned conflicting roles
- Reports must have appropriate approvals for publication

### Temporal Consistency
- Event end times must be after start times
- Service dates must be chronologically consistent
- Personnel hire dates must precede assignment dates
- Report dates must be consistent with referenced events

## Security and Privacy

### Classification Levels
- **Public** - General information, publicly available
- **Internal** - Internal use only, not for external distribution
- **Restricted** - Limited access, sensitive operational data
- **Confidential** - Highly sensitive, restricted access only

### Data Protection
- Personnel contact information marked as sensitive
- Security clearance information requires special handling
- Performance metrics access controlled by role
- Geographic precision may be reduced for sensitive locations

### Access Controls
- Role-based access to different data categories
- Department-based filtering for personnel data
- Location-based access controls for facility information
- Time-based access for historical vs. current data

## Implementation Guidelines

### Data Loading
1. Validate all data against schemas before loading
2. Establish referential integrity after bulk loading
3. Create indexes for frequently queried fields
4. Generate embeddings for text content

### Performance Considerations
- Index critical relationship types
- Cache frequently accessed node combinations
- Use batch operations for bulk updates
- Monitor query performance and optimize as needed

### Maintenance
- Regular schema validation runs
- Periodic relationship integrity checks
- Archive old events and reports based on retention policies
- Update embeddings when content changes significantly

## Future Enhancements

### Planned Extensions
1. **Temporal Nodes** - Explicit time period representations
2. **Cost Tracking** - Financial impact of events and maintenance
3. **Predictive Models** - ML model results as nodes
4. **External Systems** - Integration with other NAS systems
5. **Real-time Events** - Streaming event ingestion

### Schema Evolution
- Backward compatibility for schema changes
- Migration scripts for data model updates  
- Version control for schema files
- Impact analysis for breaking changes

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Schema Version**: 1.0.0
