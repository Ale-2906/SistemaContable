const assert=require('node:assert/strict');
process.env.DATABASE_PATH=':memory:';process.env.NODE_ENV='test';
const app=require('../index'),db=require('../config/database');
const {initializeSalaryScales,gradeFor}=require('../database/salaryScales');
(async()=>{
 let server;
 try{
 const parent=db.prepare('SELECT * FROM positions ORDER BY id LIMIT 1').get();
 const position=db.prepare("INSERT INTO positions (department_id,name,base_salary) VALUES (?,'GERENTE GENERAL',1200)").run(parent.department_id).lastInsertRowid;
 const employee=db.prepare("INSERT INTO employees (cedula,first_name,last_name,position_id,department_id,hire_date,base_salary,account_number) VALUES ('TEST-SCALE','Persona','Gerencia',?,?,'2026-01-01',1200,'0000000000')").run(position,parent.department_id).lastInsertRowid;
 db.prepare("UPDATE positions SET salary_grade='',salary_min=NULL,salary_max=NULL").run();
 const before={positions:db.prepare('SELECT id,base_salary FROM positions ORDER BY id').all(),employees:db.prepare('SELECT id,base_salary FROM employees ORDER BY id').all(),history:db.prepare('SELECT * FROM salary_history ORDER BY id').all(),payrolls:db.prepare('SELECT * FROM payrolls ORDER BY id').all()};
 initializeSalaryScales(db);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM salary_scales').get().n,6);
 assert.equal(gradeFor('Diseñadora UX/UI'),'G3');assert.equal(gradeFor('Jefa Comercial'),'G5');assert.equal(gradeFor('Coordinadora Administrativa'),'G4');
 assert.equal(db.prepare('SELECT salary_grade FROM positions WHERE id=?').get(position).salary_grade,'G6');
 assert.equal(db.prepare('SELECT base_salary FROM positions WHERE id=?').get(position).base_salary,1200);
 assert.deepEqual(db.prepare('SELECT id,base_salary FROM positions ORDER BY id').all(),before.positions);
 assert.deepEqual(db.prepare('SELECT id,base_salary FROM employees ORDER BY id').all(),before.employees);
 assert.deepEqual(db.prepare('SELECT * FROM salary_history ORDER BY id').all(),before.history);
 assert.deepEqual(db.prepare('SELECT * FROM payrolls ORDER BY id').all(),before.payrolls);
 const audit=db.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action='ASSIGN_INTERNAL_SALARY_SCALE'").get().n;
 initializeSalaryScales(db);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action='ASSIGN_INTERNAL_SALARY_SCALE'").get().n,audit);
 db.prepare("UPDATE positions SET salary_grade='CUSTOM',salary_min=100,salary_max=5000 WHERE id=?").run(parent.id);initializeSalaryScales(db);assert.equal(db.prepare('SELECT salary_grade FROM positions WHERE id=?').get(parent.id).salary_grade,'CUSTOM');
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}/api`;let token;
 async function call(url,method='GET',body,status=200){const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {})},...(body ? {body:JSON.stringify(body)} : {})});const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}
 await call('/departments/salary-scales','GET',null,401);
 token=(await call('/auth/login','POST',{identifier:'admin@mysubs.com',password:'admin123'})).token;
 const scales=await call('/departments/salary-scales');assert.equal(scales.length,6);assert(scales.find(s=>s.code==='G6').out_of_range_count>=1);
 const employees=await call('/employees');assert.equal(employees.find(e=>e.id===employee).salary_grade,'G6');
 await call(`/employees/${employee}`,'PUT',{first_name:'Persona editada',position_id:position,department_id:parent.department_id});
 assert.equal(db.prepare('SELECT base_salary FROM employees WHERE id=?').get(employee).base_salary,1200);
 await call(`/employees/${employee}/salary`,'POST',{newSalary:1300,effectiveDate:'2026-11-01'},400);
 await call('/departments/positions','POST',{name:'Cargo fuera de escala',departmentId:parent.department_id,baseSalary:1000,salaryGrade:'G6',salaryMin:900,salaryMax:1500},400);
 await call(`/departments/positions/${position}`,'PUT',{name:'GERENTE GENERAL',departmentId:parent.department_id,baseSalary:1200,salaryGrade:'G6',salaryMin:2000,salaryMax:3500});
 assert.equal(db.prepare('SELECT base_salary FROM positions WHERE id=?').get(position).base_salary,1200);
 console.log('PASS: seis escalas, asignación e idempotencia; sueldos de empleados, referencias de cargos, historial y nóminas intactos; excepciones y validación de nuevos sueldos comprobadas.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
