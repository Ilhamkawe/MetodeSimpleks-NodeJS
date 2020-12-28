const {
  getLastRow: getLastRow,
  applyPivoting: applyPivoting,
  isAllNonNegative: isAllNonNegative
} = require('../simplex-helpers');

function isTableauOptimal(tableau) {
  const lastRow = getLastRow(tableau);
  return isAllNonNegative(lastRow);
}

module.exports = ({
  tableau: tableau,
  maxIterations = 50
}) => {
  let curTableau = tableau;
  let curIteration = 0;
  const tableaus = [];
  while (!isTableauOptimal(curTableau) && curIteration < maxIterations) {
    tableaus.push(curTableau);
    curTableau = applyPivoting(curTableau);
    curIteration += 1;
  }
  return {
    finalTableau: curTableau,
    tableaus: tableaus,
    isOptimal: isTableauOptimal(curTableau)
  };
};
