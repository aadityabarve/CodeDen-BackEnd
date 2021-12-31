const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require("body-parser");
const request = require('request');
const fs = require('fs');
const app = express()

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Barve_2014',
  database: 'webtechnology'
});

mysqlConnection.connect((err)=>{
  if(err){
    console.log(err);
  }
});

const languagesTable = [
          { lang: 'cpp14', name: 'C++', version: 'g++ 14 GCC 7.2.0', index: '1'},
          { lang: 'cpp14', name: 'C++', version: 'g++ 14 GCC 9.1.0', index: '3'},
          { lang: 'java', name: 'Java', version: 'JDK 9.0.1', index: '1' },
          { lang: 'java', name: 'Java', version: 'JDK 10.0.1', index: '2' },
          { lang: 'nodejs', name: 'NodeJS', version: '9.2.0', index: '1' },
          { lang: 'python3', name: 'Python 3', version: '3.6.5', index: '2' },
          { lang: 'csharp', name: 'C#', version: 'mono 5.10.1', index: '2' },
          { lang: 'ruby', name: 'Ruby', version: '2.2.4', index: '0' },
          { lang: 'php', name: 'PHP', version: '5.6.16', index: '0' },
          { lang: 'php', name: 'PHP', version: '7.2.5', index: '2' },
]

app.get('/', function(req,res){
  res.send("Hello World");
});

app.get('/langs', function(req,res){
  //console.log(languagesTable['php'][0]['version']);
  console.log("Langs called");
  return res.status(200).send({langs: languagesTable});
});

app.post('/signup', function(req,res){
  mysqlConnection.query(`select * from User where email = "${req.body.email}"`, function(err,result){
    if(err){
      console.log(err);
      return res.status(400).send('Error Occurred');
    }
    else{
      if(result.length != 0){
        console.log(result);
        return res.status(200).send({"message": "User already registered", "valid": 0});
      }
      else{
        var username = req.body.email.substr(0,req.body.email.indexOf('@'));
        mysqlConnection.query(`insert into User values("${req.body.email}","${req.body.phone}","${req.body.password}","${username}")`, function(err,result){
          if(err){
            console.log(err);
            return res.status(400).send('Error Occurred');
          }
          else{
            return res.status(200).send({"message": "User signed up successfully", "valid": 1});
          }
        });
      }
    }
  });
});

app.post('/login', function(req,res){
  console.log(req.body.email);
  console.log(req.body.password);
  console.log(`select * from User where email = "${req.body.email}" and password = "${req.body.password}"`);
  mysqlConnection.query(`select * from User where email = "${req.body.email}" and password = "${req.body.password}"`, function(err,result){
    if(err){
      console.log(err);
      return res.status(400).send('Error');
    }
    else {
      console.log(result);
      if(result.length == 0){
        return res.status(200).send({"valid": 0});
      }
      else{
        return res.status(200).send({"valid": 1});
      }
    }
  });
});

app.get('/problems/:email', function(req,res){
  mysqlConnection.query(`select * from Problem`, function(err,result){
    if(err){
      console.log(err);
    }
    else{
      var email = req.params.email;
      console.log(`select * from problem_user_mapping where email="${email}"`);
      mysqlConnection.query(`select * from problem_user_mapping where email="${email}"`, function(err,mapping){
          if(err){
            console.log(err);
          }
          else{
            for (var i = 0; i < result.length; i++) {
              result[i].solved=0;
            }
            for (var i = 0; i < mapping.length; i++) {
              for (var j = 0; j < result.length; j++) {
                if(result[j].problem_id == mapping[i].problem_id){
                  result[j].solved = 1;
                  break;
                }
              }
            }
            var marks_scored=0;
            for (var i = 0; i < result.length; i++) {
              if(result[i].solved == 1){
                console.log(result[i].max_score);
                marks_scored+=result[i].max_score;
              }
            }
            console.log(result);
            return res.status(200).send({"problems": result, "score": marks_scored});
          }
      });
    }
  });
});

app.get('/problem_data/:problem_id', function(req,res){
  var problem_id = req.params.problem_id;
  mysqlConnection.query(`select * from Problem where problem_id=${problem_id}`, function(err, result){
    if(err){
      console.log(err);
    }
    else{
      var path = "./problem_description/"+result[0].description;
      // var path = "./problem_description/description1.html";
      fs.readFile(path,'utf8',function(err,data){
        result[0].description = data;
        return res.status(200).send(result);
      });
    }
  });
})

app.post('/run', function(req,res){
  const JDOODLE_ENDPOINT = 'https://api.jdoodle.com/execute';
  const body = req.body;
  try{
    var entry = {};

    for(var languageEntry in languagesTable){
      if(languageEntry.version == body.version && languageEntry.lang == body.lang){
        entry = languageEntry;
        break;
      }
    }
    console.log(entry);
    console.log("Hello");
    const index = entry['index'];
    const runRequestBody = {
        script : body.program,
        language: body.lang,
        versionIndex: index,
        clientId: "555c6304059a2e93078706f1cab7e9c8",
        clientSecret: "c3e8a307c0cd082247fea658def79c7c363e779e992a67de04fae292b319991b",
        stdin: body.input
    };

    request.post({
        url: JDOODLE_ENDPOINT,
        json: runRequestBody
    },
    // console.log(body);
    function(error, response, body){
      console.log("Error", error);
      JSON.stringify(body);
      console.log("Body", body);
      return res.status(200).json(body);
    });

  }
  catch(error){
    console.log('request fail');
    return res.status(400).send('request fail');
  }
});

app.post('/submit', function(req,res){
  const JDOODLE_ENDPOINT = 'https://api.jdoodle.com/execute';
  const body = req.body;
  try{
    var entry = {};

    for(var languageEntry in languagesTable){
      if(languageEntry.version == body.version && languageEntry.lang == body.lang){
        entry = languageEntry;
        break;
      }
    }
    var problem_id = body.problem_id;
    const email = body.email;
    const index = entry['index'];
    mysqlConnection.query(`select * from Problem where problem_id=${problem_id}`, function(err, result){
      if(err){
        console.log(err);
      }
      else{
        var input_path = "./problem_input/"+result[0].input;
        fs.readFile(input_path,'utf8',function(err,data){
          if(err){
            console.log(err);
          }
          else{
            const runRequestBody = {
                script : body.program,
                language: body.lang,
                versionIndex: index,
                clientId: "555c6304059a2e93078706f1cab7e9c8",
                clientSecret: "c3e8a307c0cd082247fea658def79c7c363e779e992a67de04fae292b319991b",
                stdin: data
            };

            request.post({
                url: JDOODLE_ENDPOINT,
                json: runRequestBody
            },
            function(error, response, body){
              console.log("Error", error);
              JSON.stringify(body);
              console.log("Body", body);
              var output_path = "./problem_output/"+result[0].output;
              fs.readFile(output_path,'utf8',function(err,data){
                if(err){
                  console.log(err);
                }
                else{
                  console.log(body);
                  console.log(data);
                  if(body.output==data){
                    mysqlConnection.query(`select * from problem_user_mapping where email="${email}" and problem_id=${problem_id}`, function(err, result){
                      if(err){
                        console.log(err);
                        return res.status(400).send('Error Occurred');
                      }
                      else if(result.length==0){
                        mysqlConnection.query(`insert into problem_user_mapping values("${email}",${problem_id})`, function(err, result){
                          if(err){
                            console.log(err);
                            return res.status(400).send('Error Occurred');
                          }
                          else{
                            return res.status(200).send({"solved":1});
                          }
                        });
                      }
                      else{
                        return res.status(200).send({"solved":1});
                      }
                    });
                  }
                  else{
                    return res.status(200).send({"solved":0});
                  }
                }
              });
            });
          }
        });
      }
    });

  }
  catch(error){
    console.log('request fail');
    return res.status(400).send('request fail');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, function(err){
    console.log("Server listening on Port", port);
});
