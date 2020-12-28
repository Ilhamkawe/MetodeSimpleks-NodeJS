const assert = require('assert');
const mathjs = require('mathjs');

function mapVector (namedVector) {
  const varNames = Object.keys(namedVector).sort();
  const indicesToNames = {};
  const namesToIndices = {};
  const vectorValues = [];
  varNames.forEach((coefficientName, index) => {
    indicesToNames[`${index}`] = coefficientName;
    namesToIndices[coefficientName] = index;
    vectorValues.push(namedVector[coefficientName]);
  });
  return {
    varNames,
    indicesToNames,
    namesToIndices,
    vectorValues,
  };
}

function completeCoefficientVector ({
  vector,
  allNames,
}) {
  const nextVector = {};
  allNames.forEach((curName) => {
    const vectorValue = vector[curName];
    const curValue = vectorValue || 0;
    nextVector[curName] = curValue;
  });
  return nextVector;
}

function assertCoefficientParallelism ({
  objective,
  constraints,
}) {
  const objectiveVector = mapVector(objective).varNames;
  const constraintVectors = constraints.map((constraint) => (
    mapVector(constraint.namedVector).varNames
  ));
  constraintVectors.forEach((constraintVector) => {
    assert.deepEqual(constraintVector, objectiveVector);
  });
}

function generateTableauRow ({
  vectorValues,
  constant = 0,
  rowNo = 0,
  numRows = 1,
}) {
  const firstPart = vectorValues;
  const firstZeroes = new Array(rowNo).fill(0);
  const secondZeroes = new Array(numRows - rowNo - 1).fill(0);
  const secondPart = [
    ...firstZeroes,
    1,
    ...secondZeroes,
  ];
  return [
    ...firstPart,
    ...secondPart,
    constant,
  ];
}

function constraintToPreRow ({
  namedVector,
  constraint,
  constant = 0,
}) {
  const { vectorValues } = mapVector(namedVector);
  if (constraint === '<=') {
    return {
      vectorValues,
      constant,
    };
  } else if (constraint === '>=') {
    return {
      vectorValues: mathjs.multiply(vectorValues, -1),
      constant: constant * -1,
    };
  }
  throw new Error('Not in standardized form');
}

function getLastRow (tableau) {
  return tableau[tableau.length - 1];
}

function getColumn ({
  tableau,
  columnNo,
}) {
  return tableau.map((row) => row[columnNo]);
}

function getLastColumn (tableau) {
  const columnNo = tableau[0].length - 1;
  return getColumn({
    tableau,
    columnNo,
  });
}

function getPivotColumnIndex (tableau) {
  const lastRow = getLastRow(tableau);
  const pivotColumnPair = lastRow.reduce((accMin, curEntry, curIndex) => {
    if (accMin.value <= curEntry) return accMin;
    return { value: curEntry, index: curIndex };
  }, { value: 0, index: -1 });
  return pivotColumnPair.index;
}

function getPivotRowIndex (tableau) {
  const lastColumn = getLastColumn(tableau);
  const lastConstraintColumn = lastColumn.slice(0, lastColumn.length - 1);
  const pivotColumnIndex = getPivotColumnIndex(tableau);
  const pivotColumn = getColumn({
    tableau,
    columnNo: pivotColumnIndex,
  });
  const pivotConstraintColumn = pivotColumn.slice(0, pivotColumn.length - 1);
  const dividedLastColumn = lastConstraintColumn.map(
    (entry, index) => entry / pivotConstraintColumn[index]
  );
  const pivotRowPair = dividedLastColumn.reduce((accMin, curEntry, curIndex) => {
    // can the acc min be negative?
    if (pivotConstraintColumn[curIndex] < 0) return accMin;
    if (accMin.value <= curEntry) return accMin;
    if (curEntry < 0) return accMin;
    return { value: curEntry, index: curIndex };
  }, { value: Infinity, index: -1 });
  return pivotRowPair.index;
}

function adjustNonPivotRow ({
  nonPivotRow,
  adjustedPivotRow,
  pivotCoords,
}) {
  const {
    colNo,
  } = pivotCoords;
  const pivotRowMultiplier = nonPivotRow[colNo] * -1;
  const multipliedPivotRow = mathjs.multiply(adjustedPivotRow, pivotRowMultiplier);
  const adjustedInputRow = mathjs.add(nonPivotRow, multipliedPivotRow);
  adjustedInputRow[colNo] = 0;
  return adjustedInputRow;
}

function adjustPivotRow ({
  pivotRow,
  pivotCoords,
}) {
  const {
    colNo,
  } = pivotCoords;
  const pivotEntry = pivotRow[colNo];
  const adjustedPivotRow = pivotRow.map((curEntry) => curEntry / pivotEntry);
  adjustedPivotRow[colNo] = 1;
  return adjustedPivotRow;
}

function getPivotCoords (tableau) {
  return {
    rowNo: getPivotRowIndex(tableau),
    colNo: getPivotColumnIndex(tableau),
  };
}

function applyPivoting (tableau) {
  const pivotCoords = getPivotCoords(tableau);
  const {
    rowNo,
  } = pivotCoords;
  const pivotRow = tableau[rowNo];
  const adjustedPivotRow = adjustPivotRow({
    pivotRow,
    pivotCoords,
  });
  const nextTableau = tableau.map((curRow, curIndex) => {
    if (curIndex === rowNo) return pivotRow;
    return adjustNonPivotRow({
      nonPivotRow: curRow,
      adjustedPivotRow,
      pivotCoords,
    });
  });
  return nextTableau;
}

function isAllNonNegative (vector) {
  return vector.reduce((acc, curItem) => acc && (curItem >= 0), true);
}

function isActive (vector) {
  const numNonZeroes = vector.reduce((acc, curItem) => {
    if (curItem === 0) return acc;
    return acc + 1;
  });
  return numNonZeroes === 1;
}

function getActiveVarCoefficient (column) {
  return column.reduce((acc, curEntry) => {
    if (curEntry === 0) return acc;
    return curEntry;
  }, 0);
}

function extractNamedSolution ({
  tableau,
  indicesToNames,
  allNames,
}) {
  const lastColumn = getLastColumn(tableau);
  const allColumns = mathjs.transpose(tableau);
  const activeColumnIndices = allColumns
    .map((curColumn, curIndex) => ({
      isActiveColumn: isActive(curColumn),
      index: curIndex,
    }))
    .filter(({ isActiveColumn }) => isActiveColumn)
    .map(({ index }) => index);
  const activeVarCoefficients = activeColumnIndices
    .map((curActiveIndex) => getActiveVarCoefficient(allColumns[curActiveIndex]));
  const activeVarIndicesAndValues = activeVarCoefficients.map((curCoefficient, curIndex) => {
    const curActiveIndex = activeColumnIndices[curIndex];
    const curActiveValue = lastColumn[curIndex] / curCoefficient;
    return {
      index: curActiveIndex,
      value: curActiveValue,
    };
  });
  const vector = {};
  activeVarIndicesAndValues.forEach(({ index, value }) => {
    const indexString = `${index}`;
    if (!indicesToNames[indexString]) return;
    const coefficientName = indicesToNames[indexString];
    vector[coefficientName] = value;
  });
  const optimum = activeVarIndicesAndValues[activeVarIndicesAndValues.length - 1].value;
  const coefficients = completeCoefficientVector({
    vector,
    allNames,
  });
  return {
    coefficients,
    optimum,
  };
}

module.exports = {
  mapVector,
  assertCoefficientParallelism,
  generateTableauRow,
  constraintToPreRow,
  getPivotColumnIndex,
  getPivotRowIndex,
  getPivotCoords,
  getLastRow,
  applyPivoting,
  adjustPivotRow,
  adjustNonPivotRow,
  isAllNonNegative,
  isActive,
  extractNamedSolution,
  completeCoefficientVector,
};
