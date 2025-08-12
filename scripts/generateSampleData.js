#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to generate random IDs
const generateId = (prefix, num) => `${prefix}${String(num).padStart(6, '0')}`;

// Utility function to get random element from array
const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

// Utility function to get random elements from array (for multiple selection)
const randomChoices = (array, count) => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Utility function to generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Utility function to format date as ISO string
const formatDate = (date) => date.toISOString().split('T')[0];
const formatDateTime = (date) => date.toISOString();

// Constants for data generation
const EQUIPMENT_CATEGORIES = ['surveillance', 'navigation', 'weather', 'communication'];
const EQUIPMENT_TYPES = {
  surveillance: ['radar_short_range', 'radar_long_range', 'radom'],
  navigation: ['vor', 'glide_slope', 'localizer', 'marker_beacon'],
  weather: ['asos', 'awos', 'adas'],
  communication: ['tvs', 'vscs', 'tdm_ethernet']
};

const LOCATION_TYPES = [
  'airport_terminal', 'faa_stars_terminal', 'faa_eram_terminal',
  'approach_control', 'tower', 'geographic_location',
  'maintenance_facility', 'operations_center'
];

const PERSONNEL_ROLES = [
  'maintenance_technician', 'senior_maintenance_technician', 'maintenance_supervisor',
  'operations_specialist', 'air_traffic_controller', 'safety_analyst',
  'quality_assurance_specialist', 'engineering_technician', 'systems_administrator',
  'facility_manager', 'regional_manager', 'inspector', 'trainer', 'contractor'
];

const EXPERTISE_AREAS = [
  'radar_systems', 'navigation_aids', 'weather_systems', 'communication_equipment',
  'power_systems', 'facility_maintenance', 'software_systems', 'network_infrastructure',
  'safety_analysis', 'quality_control', 'project_management', 'training_development'
];

const EVENT_TYPES = [
  'maintenance_scheduled', 'maintenance_unscheduled', 'full_outage', 'partial_outage',
  'system_failure', 'power_failure', 'communication_failure', 'weather_related',
  'equipment_malfunction', 'software_issue', 'calibration_required', 'inspection',
  'upgrade', 'replacement'
];

const REPORT_TYPES = [
  'action_report', 'lessons_learned', 'incident_analysis', 'safety_assessment',
  'maintenance_summary', 'trend_analysis', 'performance_review', 'inspection_report',
  'technical_evaluation', 'cost_analysis', 'compliance_audit', 'risk_assessment'
];

// Sample data arrays
const FIRST_NAMES = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Mary',
  'James', 'Jennifer', 'William', 'Patricia', 'Richard', 'Elizabeth',
  'Joseph', 'Linda', 'Thomas', 'Barbara', 'Christopher', 'Susan'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White'
];

const LOCATION_NAMES = [
  'JFK International Airport', 'LAX Terminal', 'Chicago O\'Hare', 'Miami International',
  'Denver Tech Center', 'Boston Logan', 'Seattle Approach', 'Atlanta ARTCC',
  'Phoenix Sky Harbor', 'Dallas Fort Worth', 'Houston Intercontinental', 'Las Vegas McCarran',
  'San Francisco International', 'Orlando International', 'Washington Dulles', 'Minneapolis St. Paul',
  'Detroit Metro', 'Charlotte Douglas', 'Tampa International', 'St. Louis Lambert'
];

// US coordinates for realistic locations
const US_COORDINATES = [
  { lat: 40.6413, lng: -73.7781 }, // JFK
  { lat: 33.9428, lng: -118.4081 }, // LAX
  { lat: 41.9742, lng: -87.9073 }, // ORD
  { lat: 25.7959, lng: -80.2870 }, // MIA
  { lat: 39.8561, lng: -104.6737 }, // DEN
  { lat: 42.3656, lng: -71.0096 }, // BOS
  { lat: 47.4502, lng: -122.3088 }, // SEA
  { lat: 33.6407, lng: -84.4277 }, // ATL
  { lat: 33.4484, lng: -112.0740 }, // PHX
  { lat: 32.8998, lng: -97.0403 }, // DFW
  { lat: 29.9902, lng: -95.3368 }, // IAH
  { lat: 36.0840, lng: -115.1537 }, // LAS
  { lat: 37.6213, lng: -122.3790 }, // SFO
  { lat: 28.4312, lng: -81.3081 }, // MCO
  { lat: 38.9531, lng: -77.4565 }, // IAD
  { lat: 44.8848, lng: -93.2223 }, // MSP
  { lat: 42.2162, lng: -83.3554 }, // DTW
  { lat: 35.2144, lng: -80.9473 }, // CLT
  { lat: 27.9758, lng: -82.5331 }, // TPA
  { lat: 38.7499, lng: -90.3744 }  // STL
];

// Generate sample data
function generateSampleData() {
  const nodes = [];
  const edges = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  console.log('Generating sample data...');

  // Generate 20 locations
  console.log('Generating locations...');
  const locations = [];
  for (let i = 1; i <= 20; i++) {
    const coord = US_COORDINATES[i - 1] || { 
      lat: 25 + Math.random() * 25, 
      lng: -125 + Math.random() * 50 
    };
    
    const location = {
      id: generateId('LOC', i),
      name: LOCATION_NAMES[i - 1] || `Location ${i}`,
      type: randomChoice(LOCATION_TYPES),
      coordinates: {
        latitude: coord.lat + (Math.random() - 0.5) * 0.1,
        longitude: coord.lng + (Math.random() - 0.5) * 0.1,
        elevation: Math.floor(Math.random() * 5000)
      },
      address: {
        street: `${Math.floor(Math.random() * 9999) + 1} Airport Way`,
        city: `City ${i}`,
        state: randomChoice(['CA', 'TX', 'FL', 'NY', 'IL', 'GA', 'WA', 'CO', 'AZ', 'NV']),
        postalCode: String(Math.floor(Math.random() * 90000) + 10000),
        country: 'United States'
      },
      timeZone: randomChoice(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']),
      operatingHours: {
        '24x7': Math.random() > 0.3
      },
      regionalDesignation: randomChoice(['eastern', 'central', 'western', 'southern', 'great_lakes', 'new_england', 'northwest_mountain', 'southwest']),
      capacity: {
        equipmentCount: Math.floor(Math.random() * 10) + 1,
        personnelCount: Math.floor(Math.random() * 20) + 5,
        maxCapacity: Math.floor(Math.random() * 100) + 50
      },
      contactInfo: {
        phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: `operations@location${i}.faa.gov`
      },
      metadata: {
        createdAt: formatDateTime(new Date()),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    };
    
    locations.push(location);
    nodes.push(location);
  }

  // Generate 50 equipment items across four categories
  console.log('Generating equipment...');
  const equipment = [];
  for (let i = 1; i <= 50; i++) {
    const category = EQUIPMENT_CATEGORIES[Math.floor((i - 1) / 12.5)];
    const equipmentType = randomChoice(EQUIPMENT_TYPES[category]);
    const locationId = randomChoice(locations).id;
    
    const installDate = randomDate(new Date('2018-01-01'), new Date('2023-12-31'));
    const lastService = randomDate(installDate, now);
    const nextService = new Date(lastService.getTime() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000);
    
    const eq = {
      id: generateId('EQ', i),
      name: `${equipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Unit ${i}`,
      type: equipmentType,
      category: category,
      model: `Model-${Math.floor(Math.random() * 9000) + 1000}`,
      manufacturer: randomChoice(['Raytheon', 'Northrop Grumman', 'L3Harris', 'Thales', 'Honeywell']),
      installationDate: formatDate(installDate),
      operationalStatus: randomChoice(['operational', 'maintenance', 'offline', 'decommissioned']),
      criticalityLevel: randomChoice(['critical', 'high', 'medium', 'low']),
      location: locationId,
      lastServiceDate: formatDate(lastService),
      nextServiceDate: formatDate(nextService),
      maintenanceSchedule: randomChoice(['weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'as_needed']),
      specifications: {
        frequency: category === 'communication' ? `${Math.floor(Math.random() * 1000) + 100} MHz` : undefined,
        range: category === 'surveillance' ? `${Math.floor(Math.random() * 200) + 50} nm` : undefined,
        power: `${Math.floor(Math.random() * 5000) + 500} W`,
        accuracy: category === 'navigation' ? `±${Math.random() * 5 + 0.1}°` : undefined
      },
      metadata: {
        createdAt: formatDateTime(new Date()),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    };
    
    equipment.push(eq);
    nodes.push(eq);
    
    // Create LOCATED_AT relationship
    edges.push({
      sourceId: eq.id,
      targetId: locationId,
      type: 'LOCATED_AT',
      direction: 'directed',
      weight: 1.0,
      properties: {
        startDate: formatDateTime(installDate),
        frequency: 'continuous'
      },
      context: {
        description: `${eq.name} is located at ${locations.find(l => l.id === locationId).name}`,
        category: 'operational',
        source: 'automated',
        reliability: 'verified'
      },
      metadata: {
        createdAt: formatDateTime(new Date()),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    });
  }

  // Generate 15 personnel with expertise tags
  console.log('Generating personnel...');
  const personnel = [];
  for (let i = 1; i <= 15; i++) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const role = randomChoice(PERSONNEL_ROLES);
    const department = randomChoice(['maintenance', 'operations', 'safety', 'engineering', 'quality_assurance', 'management', 'training', 'contractor_services']);
    const homeLocation = randomChoice(locations).id;
    const hireDate = randomDate(new Date('2015-01-01'), new Date('2023-12-31'));
    const experienceYears = Math.floor((now - hireDate) / (365 * 24 * 60 * 60 * 1000)) + Math.floor(Math.random() * 10);
    
    const person = {
      id: generateId('PER', i),
      name: {
        first: firstName,
        last: lastName
      },
      employeeId: `EMP${String(Math.floor(Math.random() * 90000) + 10000)}`,
      role: role,
      department: department,
      status: randomChoice(['active', 'inactive', 'leave', 'training', 'retired', 'transferred']),
      homeLocation: homeLocation,
      certifications: [
        {
          name: randomChoice(['FAA Certification', 'Electronics Certification', 'Safety Certification']),
          level: randomChoice(['basic', 'intermediate', 'advanced', 'expert', 'instructor']),
          issueDate: formatDate(randomDate(hireDate, now)),
          expiryDate: formatDate(new Date(now.getTime() + Math.random() * 2 * 365 * 24 * 60 * 60 * 1000)),
          issuingAuthority: 'FAA',
          certificationNumber: `CERT-${Math.floor(Math.random() * 900000) + 100000}`
        }
      ],
      expertiseAreas: randomChoices(EXPERTISE_AREAS, Math.floor(Math.random() * 4) + 2),
      securityClearance: {
        level: randomChoice(['none', 'public_trust', 'secret', 'top_secret']),
        expiryDate: formatDate(new Date(now.getTime() + Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)),
        status: 'active'
      },
      contactInfo: {
        workPhone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@faa.gov`,
        emergencyContact: {
          name: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
          phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          relationship: randomChoice(['spouse', 'parent', 'sibling', 'child'])
        }
      },
      schedule: {
        shiftType: randomChoice(['day_shift', 'evening_shift', 'night_shift', 'rotating', 'on_call', 'flexible']),
        hoursPerWeek: Math.floor(Math.random() * 20) + 35,
        onCallFrequency: randomChoice(['never', 'occasional', 'weekly', 'monthly', 'as_needed'])
      },
      workload: {
        activeAssignments: Math.floor(Math.random() * 10) + 1,
        averageResponseTime: Math.floor(Math.random() * 60) + 15,
        completedTasksThisMonth: Math.floor(Math.random() * 50) + 5,
        utilizationRate: Math.floor(Math.random() * 40) + 60
      },
      hireDate: formatDate(hireDate),
      yearsOfExperience: experienceYears,
      metadata: {
        createdAt: formatDateTime(new Date()),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    };
    
    personnel.push(person);
    nodes.push(person);
    
    // Create WORKS_AT relationship
    edges.push({
      sourceId: person.id,
      targetId: homeLocation,
      type: 'WORKS_AT',
      direction: 'directed',
      weight: 0.9,
      properties: {
        startDate: formatDateTime(hireDate),
        frequency: 'daily'
      },
      context: {
        description: `${firstName} ${lastName} works at ${locations.find(l => l.id === homeLocation).name}`,
        category: 'organizational',
        source: 'manual',
        reliability: 'verified'
      },
      metadata: {
        createdAt: formatDateTime(new Date()),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    });
    
    // Create MAINTAINS relationships with some equipment
    const maintainedEquipment = randomChoices(equipment, Math.floor(Math.random() * 5) + 2);
    maintainedEquipment.forEach(eq => {
      if (person.expertiseAreas.some(area => 
        (eq.category === 'surveillance' && area === 'radar_systems') ||
        (eq.category === 'navigation' && area === 'navigation_aids') ||
        (eq.category === 'weather' && area === 'weather_systems') ||
        (eq.category === 'communication' && area === 'communication_equipment')
      )) {
        edges.push({
          sourceId: person.id,
          targetId: eq.id,
          type: 'MAINTAINS',
          direction: 'directed',
          weight: 0.7,
          properties: {
            frequency: 'as-needed',
            strength: 'moderate'
          },
          context: {
            description: `${firstName} ${lastName} maintains ${eq.name}`,
            category: 'operational',
            source: 'automated',
            reliability: 'verified'
          },
          metadata: {
            createdAt: formatDateTime(new Date()),
            updatedAt: formatDateTime(new Date()),
            version: '1.0'
          }
        });
      }
    });
  }

  // Generate 100 maintenance events over a twelve-month window
  console.log('Generating maintenance events...');
  const events = [];
  for (let i = 1; i <= 100; i++) {
    const eventType = randomChoice(EVENT_TYPES);
    const startTime = randomDate(oneYearAgo, now);
    const duration = Math.floor(Math.random() * 480) + 30; // 30 minutes to 8 hours
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const affectedEquipmentList = randomChoices(equipment, Math.floor(Math.random() * 3) + 1);
    const assignedPersonnelList = randomChoices(personnel, Math.floor(Math.random() * 2) + 1);
    
    const event = {
      id: generateId('EVT', i),
      type: eventType,
      severity: randomChoice(['critical', 'high', 'medium', 'low', 'informational']),
      status: randomChoice(['open', 'in_progress', 'resolved', 'closed', 'cancelled', 'scheduled']),
      title: `${eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${affectedEquipmentList[0].name}`,
      description: `${eventType.replace(/_/g, ' ')} event affecting ${affectedEquipmentList.map(e => e.name).join(', ')}. Requires immediate attention from maintenance team.`,
      startTime: formatDateTime(startTime),
      endTime: formatDateTime(endTime),
      impactLevel: randomChoice(['no_impact', 'minimal', 'moderate', 'significant', 'severe']),
      affectedEquipment: affectedEquipmentList.map(e => e.id),
      affectedLocations: [...new Set(affectedEquipmentList.map(e => e.location))],
      assignedPersonnel: assignedPersonnelList.map(p => p.id),
      rootCause: {
        category: randomChoice(['hardware_failure', 'software_defect', 'human_error', 'environmental', 'power_related', 'network_related', 'aging_equipment', 'design_flaw', 'maintenance_related', 'external_interference', 'unknown']),
        details: `Root cause analysis indicates ${randomChoice(['component failure', 'configuration error', 'environmental factors', 'wear and tear'])} as primary cause.`,
        contributingFactors: [
          randomChoice(['Weather conditions', 'High usage', 'Deferred maintenance', 'Configuration drift'])
        ]
      },
      resolution: {
        method: randomChoice(['repair', 'replacement', 'reconfiguration', 'software_update', 'calibration', 'restart', 'workaround', 'deferred_maintenance']),
        details: `Resolved through ${randomChoice(['component replacement', 'software patch', 'configuration update', 'system restart'])} and validation testing.`,
        partsUsed: [
          {
            partNumber: `PART-${Math.floor(Math.random() * 90000) + 10000}`,
            description: randomChoice(['Circuit Board', 'Power Supply', 'Cable Assembly', 'Antenna']),
            quantity: Math.floor(Math.random() * 3) + 1
          }
        ],
        toolsUsed: [
          randomChoice(['Multimeter', 'Oscilloscope', 'Power Analyzer', 'Network Tester'])
        ]
      },
      metrics: {
        responseTime: Math.floor(Math.random() * 120) + 15,
        resolutionTime: duration,
        downtime: Math.floor(duration * (Math.random() * 0.8 + 0.2)),
        cost: Math.floor(Math.random() * 5000) + 500
      },
      tags: [eventType.split('_')[0], randomChoice(['urgent', 'routine', 'scheduled', 'emergency'])],
      metadata: {
        createdAt: formatDateTime(startTime),
        updatedAt: formatDateTime(endTime),
        createdBy: randomChoice(assignedPersonnelList).id,
        version: '1.0'
      }
    };
    
    events.push(event);
    nodes.push(event);
    
    // Create relationships for events
    // AFFECTED_BY relationships with equipment
    affectedEquipmentList.forEach(eq => {
      // Map event impact levels to relationship impact levels
      const impactMapping = {
        'no_impact': 'none',
        'minimal': 'low',
        'moderate': 'medium', 
        'significant': 'high',
        'severe': 'critical'
      };
      
      edges.push({
        sourceId: eq.id,
        targetId: event.id,
        type: 'AFFECTED_BY',
        direction: 'directed',
        weight: 0.8,
        properties: {
          startDate: formatDateTime(startTime),
          endDate: formatDateTime(endTime),
          duration: duration,
          impact: impactMapping[event.impactLevel] || 'medium'
        },
        context: {
          description: `${eq.name} was affected by ${event.title}`,
          category: 'operational',
          source: 'automated',
          reliability: 'verified'
        },
        metadata: {
          createdAt: formatDateTime(startTime),
          updatedAt: formatDateTime(endTime),
          version: '1.0'
        }
      });
    });
    
    // ASSIGNED_TO relationships with personnel
    assignedPersonnelList.forEach(person => {
      edges.push({
        sourceId: person.id,
        targetId: event.id,
        type: 'ASSIGNED_TO',
        direction: 'directed',
        weight: 0.9,
        properties: {
          startDate: formatDateTime(startTime),
          endDate: formatDateTime(endTime),
          frequency: 'one-time'
        },
        context: {
          description: `${person.name.first} ${person.name.last} was assigned to ${event.title}`,
          category: 'operational',
          source: 'manual',
          reliability: 'verified'
        },
        metadata: {
          createdAt: formatDateTime(startTime),
          updatedAt: formatDateTime(endTime),
          version: '1.0'
        }
      });
    });
  }

  // Generate 75 action reports with lessons learned
  console.log('Generating action reports...');
  const reports = [];
  for (let i = 1; i <= 75; i++) {
    const reportType = randomChoice(REPORT_TYPES);
    const author = randomChoice(personnel);
    const createdDate = randomDate(oneYearAgo, now);
    const relatedEventsList = randomChoices(events, Math.floor(Math.random() * 3) + 1);
    const relatedEquipmentList = [...new Set(relatedEventsList.flatMap(e => e.affectedEquipment))];
    
    const report = {
      id: generateId('RPT', i),
      type: reportType,
      title: `${reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${relatedEventsList[0].title}`,
      status: randomChoice(['draft', 'under_review', 'approved', 'published', 'archived', 'superseded']),
      classification: randomChoice(['public', 'internal', 'restricted', 'confidential']),
      summary: `This ${reportType.replace(/_/g, ' ')} provides analysis and recommendations based on recent operational events and their impact on system performance.`,
      content: {
        background: `Following the occurrence of multiple maintenance events in the past quarter, this report analyzes patterns and provides recommendations for improving operational efficiency.`,
        methodology: `Data analysis was performed using event logs, maintenance records, and personnel interviews. Statistical analysis and trend identification techniques were applied.`,
        findings: [
          {
            title: randomChoice(['Equipment Reliability Issues', 'Maintenance Schedule Optimization', 'Personnel Training Gaps', 'Process Improvements']),
            description: `Analysis reveals significant patterns in ${randomChoice(['equipment failure rates', 'response times', 'resolution effectiveness', 'cost trends'])}.`,
            severity: randomChoice(['critical', 'high', 'medium', 'low', 'informational']),
            category: randomChoice(['technical', 'operational', 'procedural', 'training'])
          },
          {
            title: randomChoice(['Cost Impact Analysis', 'Performance Metrics', 'Safety Considerations', 'Resource Utilization']),
            description: `Secondary analysis shows correlation between ${randomChoice(['preventive maintenance', 'staff expertise', 'equipment age', 'environmental factors'])} and incident rates.`,
            severity: randomChoice(['high', 'medium', 'low', 'informational']),
            category: randomChoice(['financial', 'performance', 'safety', 'efficiency'])
          }
        ],
        recommendations: [
          {
            title: randomChoice(['Increase Preventive Maintenance', 'Staff Training Enhancement', 'Equipment Upgrades', 'Process Standardization']),
            description: `Implement enhanced ${randomChoice(['maintenance schedules', 'training programs', 'monitoring systems', 'documentation procedures'])} to reduce incident frequency.`,
            priority: randomChoice(['critical', 'high', 'medium', 'low']),
            timeline: randomChoice(['immediate', '30 days', '90 days', '6 months', '1 year']),
            assignedTo: randomChoice(personnel).id,
            estimatedCost: Math.floor(Math.random() * 50000) + 10000
          }
        ],
        lessonsLearned: [
          {
            lesson: `Early detection and response significantly reduces ${randomChoice(['downtime', 'repair costs', 'safety risks', 'operational impact'])}.`,
            applicability: randomChoice(['specific', 'departmental', 'organizational', 'industry-wide']),
            category: randomChoice(['process_improvement', 'safety_enhancement', 'technical_solution', 'training_need', 'policy_change', 'resource_allocation'])
          },
          {
            lesson: `Cross-functional collaboration improves ${randomChoice(['problem resolution', 'knowledge sharing', 'efficiency', 'quality outcomes'])}.`,
            applicability: randomChoice(['departmental', 'organizational', 'industry-wide']),
            category: randomChoice(['process_improvement', 'training_need', 'resource_allocation'])
          }
        ]
      },
      relatedEvents: relatedEventsList.map(e => e.id),
      relatedEquipment: relatedEquipmentList,
      relatedPersonnel: [author.id],
      relatedLocations: [...new Set(relatedEventsList.flatMap(e => e.affectedLocations))],
      createdBy: author.id,
      reviewedBy: randomChoices(personnel.filter(p => p.id !== author.id), Math.floor(Math.random() * 2) + 1).map(p => p.id),
      approvedBy: randomChoice(personnel.filter(p => p.role.includes('supervisor') || p.role.includes('manager'))).id,
      createdDate: formatDate(createdDate),
      version: '1.0',
      tags: [reportType.split('_')[0], randomChoice(['quarterly', 'monthly', 'annual', 'incident-based'])],
      distribution: {
        distributionList: randomChoices(personnel, Math.floor(Math.random() * 5) + 3).map(p => p.id),
        departments: randomChoices(['maintenance', 'operations', 'safety', 'engineering', 'management'], Math.floor(Math.random() * 3) + 2)
      },
      followUpActions: [
        {
          action: `Review and update ${randomChoice(['maintenance procedures', 'training materials', 'safety protocols', 'operational guidelines'])}.`,
          assignedTo: randomChoice(personnel).id,
          dueDate: formatDate(new Date(createdDate.getTime() + Math.random() * 90 * 24 * 60 * 60 * 1000)),
          status: randomChoice(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']),
          priority: randomChoice(['critical', 'high', 'medium', 'low'])
        }
      ],
      metrics: {
        pageCount: Math.floor(Math.random() * 20) + 5,
        wordCount: Math.floor(Math.random() * 5000) + 1000,
        readingTime: Math.floor(Math.random() * 30) + 10,
        distributionCount: Math.floor(Math.random() * 50) + 10
      },
      metadata: {
        createdAt: formatDateTime(createdDate),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    };
    
    reports.push(report);
    nodes.push(report);
    
    // Create relationships for reports
    // AUTHORED relationships
    edges.push({
      sourceId: author.id,
      targetId: report.id,
      type: 'AUTHORED',
      direction: 'directed',
      weight: 1.0,
      properties: {
        startDate: formatDateTime(createdDate),
        frequency: 'one-time'
      },
      context: {
        description: `${author.name.first} ${author.name.last} authored ${report.title}`,
        category: 'reporting',
        source: 'manual',
        reliability: 'verified'
      },
      metadata: {
        createdAt: formatDateTime(createdDate),
        updatedAt: formatDateTime(new Date()),
        version: '1.0'
      }
    });
    
    // GENERATED_REPORT relationships with events
    relatedEventsList.forEach(event => {
      edges.push({
        sourceId: event.id,
        targetId: report.id,
        type: 'GENERATED_REPORT',
        direction: 'directed',
        weight: 0.8,
        properties: {
          startDate: formatDateTime(createdDate),
          frequency: 'one-time'
        },
        context: {
          description: `${event.title} generated report ${report.title}`,
          category: 'reporting',
          source: 'automated',
          reliability: 'verified'
        },
        metadata: {
          createdAt: formatDateTime(createdDate),
          updatedAt: formatDateTime(new Date()),
          version: '1.0'
        }
      });
    });
    
    // REVIEWED relationships
    report.reviewedBy.forEach(reviewerId => {
      edges.push({
        sourceId: reviewerId,
        targetId: report.id,
        type: 'REVIEWED',
        direction: 'directed',
        weight: 0.7,
        properties: {
          startDate: formatDateTime(new Date(createdDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)),
          frequency: 'one-time'
        },
        context: {
          description: `Report ${report.title} was reviewed`,
          category: 'reporting',
          source: 'manual',
          reliability: 'verified'
        },
        metadata: {
          createdAt: formatDateTime(createdDate),
          updatedAt: formatDateTime(new Date()),
          version: '1.0'
        }
      });
    });
  }

  console.log('Sample data generation complete!');
  console.log(`Generated: ${nodes.length} nodes, ${edges.length} relationships`);
  console.log(`- ${locations.length} locations`);
  console.log(`- ${equipment.length} equipment items`);
  console.log(`- ${personnel.length} personnel`);
  console.log(`- ${events.length} events`);
  console.log(`- ${reports.length} reports`);
  
  return { nodes, edges };
}

// Save data to files
function saveData(data) {
  const dataDir = path.join(__dirname, '..', 'data');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save nodes data
  const nodesPath = path.join(dataDir, 'sample-data.json');
  fs.writeFileSync(nodesPath, JSON.stringify(data.nodes, null, 2));
  console.log(`Saved ${data.nodes.length} nodes to ${nodesPath}`);
  
  // Save edges data
  const edgesPath = path.join(dataDir, 'sample-relations.json');
  fs.writeFileSync(edgesPath, JSON.stringify(data.edges, null, 2));
  console.log(`Saved ${data.edges.length} edges to ${edgesPath}`);
  
  return { nodesPath, edgesPath };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting NAS Knowledge Graph sample data generation...');
  console.log('='.repeat(50));
  
  try {
    const sampleData = generateSampleData();
    const paths = saveData(sampleData);
    
    console.log('='.repeat(50));
    console.log('✅ Sample data generation completed successfully!');
    console.log(`📁 Nodes saved to: ${paths.nodesPath}`);
    console.log(`📁 Edges saved to: ${paths.edgesPath}`);
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

export { generateSampleData, saveData };
