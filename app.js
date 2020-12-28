const express = require("express")
const SimpleSimplex = require("simple-simplex")
var bodyParser = require('body-parser')
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/result',(req, res)=>{
  res.render('result.ejs')
})

app.get('/test',(req, res)=>{
    // initialize a solver
  const solver = new SimpleSimplex({
    objective: {
      "1": 70,
      "2": 210,
      "3": 140,
    },
    constraints: [
      {
        namedVector: { "1": 1, "2": 1, "3": 1 },
        constraint: '<=',
        constant: 100,
      },
      {
        namedVector: { "1": 1.5, "2": 4, "3": 4 },
        constraint: '<=',
        constant: 480,
      },
      {
        namedVector: { "1": 40, "2": 20, "3": 30 },
        constraint: '<=',
        constant: 3200,
      },
    ],
    optimizationType: 'max',
  });
  res.json(solver)
  // call the solve method with a method name
  const result = solver.solve({
    methodName: 'simplex',
  });
  
  // see the solution and meta data
  console.log({
    solution: result.solution,
    isOptimal: result.details.isOptimal,
  });
})

app.get('/',(req, res)=>{
    res.render("index.ejs")
})

app.post('/solve',(req, res)=>{
  //  console.log(req.body.nilaik)
  let jmlproduk = req.body.jp
  let jmlkendala = req.body.jk
  let kendalas = req.body.nilaik
  let produks = req.body.nilaiP
  let contraint = req.body.constraint
  let constant = req.body.constant

  const kendala = []
  while(kendalas.length){
    console.log("Masih stay")
    kendala.push(kendalas.splice(0, jmlproduk))
    console.log(kendalas)
  } 

  let convertIntObj = (obj)=> {
    const res = {}
    
      for (const prop in obj) {
        const parsed = parseFloat(obj[prop], 10);
        res[prop] = isNaN(parsed) ? obj[prop] : parsed;
      }
    
    return res;
  }

  var obj = {}

  obj = Object.assign({}, produks);

  var kendalaObj = []
  var temp = {} 
  for(var i = 0; i < jmlkendala; i++){
    temp = {
      namedVector: {},
      constraint: contraint[i],
      constant: constant[i],
    }
    temp.namedVector = Object.assign({}, kendala[i])
    temp.namedVector = convertIntObj(temp.namedVector)
    temp.constant = parseInt(temp.constant)
    kendalaObj.push(temp)
    
  }

  obj = convertIntObj(obj)
  
  // console.log(obj)
  // res.json(kendalaObj)

  // res.json([req.body])
  // console.log(obj, kendalaObj)
  // initialize a solver
  const solver = new SimpleSimplex({
    objective: obj,
    constraints: kendalaObj,
    optimizationType: 'max',
  });
  // res.json(solver)
   
  // call the solve method with a method name
  const result = solver.solve({
    methodName: 'simplex',
  });
   console.log(solver)
   console.log(result.finalTableau)
  // see the solution and meta data
  console.log({
    solution: result.solution,
    isOptimal: result.details.isOptimal,
    tableau2: result.details.tableaus,
    ifinaltableau: result.details.finalTableau,
    
    // tableau3: result.details.tableaus[1],
    // jumlahkendala : kendala,
    // tableau3: result.details.tableaus[2],
  });
  // res.json(solver)
  res.render("result.ejs", {solusi : result.solution, jml : produks, jml_kendala : kendala,  table : solver.tableau, finaltable: result.details.finalTableau, tables : result.details.tableaus})
    
})

app.listen(process.env.PORT || 3000,()=>{
    console.log("Server sudah berjalan")



})
