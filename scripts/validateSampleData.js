#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AJV with formats
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  strict: false,
  validateSchema: false // Skip schema validation to avoid $schema issues
});
addFormats(ajv);

function loadSchema(schemaName) {
  const schemaPath = path.join(__dirname, '..', 'data', 'schema', `${schemaName}.schema.json`);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

function loadData(dataType) {
  const dataPath = path.join(__dirname, '..', 'data', `sample-${dataType}.json`);
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function validateNodes() {
  console.log('🔍 Validating sample nodes data...');
  const nodes = loadData('data');
  
  // Load all schemas
  const equipmentSchema = loadSchema('equipment');
  const locationSchema = loadSchema('location');
  const eventSchema = loadSchema('event');
  const personnelSchema = loadSchema('personnel');
  const reportSchema = loadSchema('report');
  
  // Compile validators
  const validateEquipment = ajv.compile(equipmentSchema);
  const validateLocation = ajv.compile(locationSchema);
  const validateEvent = ajv.compile(eventSchema);
  const validatePersonnel = ajv.compile(personnelSchema);
  const validateReport = ajv.compile(reportSchema);
  
  let totalNodes = 0;
  let validNodes = 0;
  const errors = [];
  
  // Group nodes by type for validation
  const nodesByType = {
    equipment: [],
    location: [],
    event: [],
    personnel: [],
    report: []
  };
  
  // Categorize nodes by ID prefix
  nodes.forEach(node => {
    totalNodes++;
    
    if (node.id.startsWith('EQ')) {
      nodesByType.equipment.push(node);
    } else if (node.id.startsWith('LOC')) {
      nodesByType.location.push(node);
    } else if (node.id.startsWith('EVT')) {
      nodesByType.event.push(node);
    } else if (node.id.startsWith('PER')) {
      nodesByType.personnel.push(node);
    } else if (node.id.startsWith('RPT')) {
      nodesByType.report.push(node);
    } else {
      errors.push({
        nodeId: node.id,
        error: 'Unknown node type based on ID prefix',
        data: node
      });
    }
  });
  
  // Validate each type
  console.log(`  📊 Validating ${nodesByType.equipment.length} equipment nodes...`);
  nodesByType.equipment.forEach(node => {
    if (validateEquipment(node)) {
      validNodes++;
    } else {
      errors.push({
        nodeId: node.id,
        type: 'equipment',
        errors: validateEquipment.errors
      });
    }
  });
  
  console.log(`  🗺️  Validating ${nodesByType.location.length} location nodes...`);
  nodesByType.location.forEach(node => {
    if (validateLocation(node)) {
      validNodes++;
    } else {
      errors.push({
        nodeId: node.id,
        type: 'location',
        errors: validateLocation.errors
      });
    }
  });
  
  console.log(`  🎯 Validating ${nodesByType.event.length} event nodes...`);
  nodesByType.event.forEach(node => {
    if (validateEvent(node)) {
      validNodes++;
    } else {
      errors.push({
        nodeId: node.id,
        type: 'event',
        errors: validateEvent.errors
      });
    }
  });
  
  console.log(`  👤 Validating ${nodesByType.personnel.length} personnel nodes...`);
  nodesByType.personnel.forEach(node => {
    if (validatePersonnel(node)) {
      validNodes++;
    } else {
      errors.push({
        nodeId: node.id,
        type: 'personnel',
        errors: validatePersonnel.errors
      });
    }
  });
  
  console.log(`  📋 Validating ${nodesByType.report.length} report nodes...`);
  nodesByType.report.forEach(node => {
    if (validateReport(node)) {
      validNodes++;
    } else {
      errors.push({
        nodeId: node.id,
        type: 'report',
        errors: validateReport.errors
      });
    }
  });
  
  return {
    totalNodes,
    validNodes,
    invalidNodes: totalNodes - validNodes,
    errors,
    nodesByType: Object.keys(nodesByType).map(type => ({
      type,
      count: nodesByType[type].length
    }))
  };
}

function validateEdges() {
  console.log('🔗 Validating sample relations data...');
  const edges = loadData('relations');
  
  // Load relationship schema
  const relationshipSchema = loadSchema('relationship');
  const validateRelationship = ajv.compile(relationshipSchema);
  
  let totalEdges = 0;
  let validEdges = 0;
  const errors = [];
  const relationshipTypes = {};
  
  edges.forEach(edge => {
    totalEdges++;
    
    // Track relationship types
    relationshipTypes[edge.type] = (relationshipTypes[edge.type] || 0) + 1;
    
    if (validateRelationship(edge)) {
      validEdges++;
    } else {
      errors.push({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        type: edge.type,
        errors: validateRelationship.errors
      });
    }
  });
  
  return {
    totalEdges,
    validEdges,
    invalidEdges: totalEdges - validEdges,
    errors,
    relationshipTypes
  };
}

function printValidationResults(nodeResults, edgeResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 VALIDATION RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  // Node validation results
  console.log('\n🔍 NODE VALIDATION:');
  console.log(`  Total nodes: ${nodeResults.totalNodes}`);
  console.log(`  Valid nodes: ${nodeResults.validNodes} ✅`);
  console.log(`  Invalid nodes: ${nodeResults.invalidNodes} ${nodeResults.invalidNodes > 0 ? '❌' : '✅'}`);
  
  console.log('\n📊 Node breakdown by type:');
  nodeResults.nodesByType.forEach(({ type, count }) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Edge validation results
  console.log('\n🔗 EDGE VALIDATION:');
  console.log(`  Total edges: ${edgeResults.totalEdges}`);
  console.log(`  Valid edges: ${edgeResults.validEdges} ✅`);
  console.log(`  Invalid edges: ${edgeResults.invalidEdges} ${edgeResults.invalidEdges > 0 ? '❌' : '✅'}`);
  
  console.log('\n🔗 Relationship types:');
  Object.entries(edgeResults.relationshipTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Print errors if any
  if (nodeResults.errors.length > 0) {
    console.log('\n❌ NODE VALIDATION ERRORS:');
    nodeResults.errors.slice(0, 5).forEach((error, index) => {
      console.log(`  ${index + 1}. Node ${error.nodeId} (${error.type || 'unknown'}):`);
      if (error.errors) {
        error.errors.forEach(err => {
          console.log(`     - ${err.instancePath || 'root'}: ${err.message}`);
        });
      } else {
        console.log(`     - ${error.error}`);
      }
    });
    if (nodeResults.errors.length > 5) {
      console.log(`     ... and ${nodeResults.errors.length - 5} more errors`);
    }
  }
  
  if (edgeResults.errors.length > 0) {
    console.log('\n❌ EDGE VALIDATION ERRORS:');
    edgeResults.errors.slice(0, 5).forEach((error, index) => {
      console.log(`  ${index + 1}. Edge ${error.sourceId} -> ${error.targetId} (${error.type}):`);
      error.errors.forEach(err => {
        console.log(`     - ${err.instancePath || 'root'}: ${err.message}`);
      });
    });
    if (edgeResults.errors.length > 5) {
      console.log(`     ... and ${edgeResults.errors.length - 5} more errors`);
    }
  }
  
  // Overall status
  const allValid = nodeResults.invalidNodes === 0 && edgeResults.invalidEdges === 0;
  console.log('\n' + '='.repeat(60));
  console.log(`📋 OVERALL VALIDATION: ${allValid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60));
  
  return allValid;
}

// Main execution
async function main() {
  console.log('Starting schema validation for generated sample data...');
  console.log('='.repeat(60));
  
  try {
    const nodeResults = validateNodes();
    const edgeResults = validateEdges();
    
    const validationPassed = printValidationResults(nodeResults, edgeResults);
    
    if (!validationPassed) {
      console.log('\n🔧 Some validation errors were found. Please review the generated data or schemas.');
      process.exit(1);
    } else {
      console.log('\n🎉 All generated data validates successfully against the schemas!');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
