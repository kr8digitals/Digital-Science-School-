import { z } from 'zod';
const text=(min=0,max=500)=>z.string().trim().min(min).max(max);
const email=z.string().trim().toLowerCase().email().max(254);
const optional=text();
const phone=text(7,35);
const consent=z.literal(true);
export const studentSchema=z.object({
 name:text(2,120),dob:text(10,10).refine(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&Date.parse(v)<Date.now()&&Date.parse(v)>Date.parse('1920-01-01')&&new Date(v).toISOString().slice(0,10)===v,'Enter a valid past date of birth'),gender:optional,
 email:email.or(z.literal('')),phone:optional,location:text(2,200),country:text(2,80),school:optional,currentClass:text(1,80),programme:z.enum(['Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3','WAEC Preparation','NECO Preparation','JAMB Preparation']),subjects:text(2),performance:optional,support:optional,
 guardianName:text(2,120),relationship:text(2,80),guardianPhone:phone,guardianEmail:email,whatsapp:optional,address:text(3,300),expectations:optional,source:optional,device:text(1,100),internet:text(1,100),timezone:text(1,100),consent,website:z.string().max(0).optional()
});
export const teacherSchema=z.object({name:text(2,120),email,phone,location:text(2,200),whatsapp:optional,qualification:text(2,150),institution:text(2,200),course:text(2,150),certification:optional,experience:z.preprocess(v=>v===''?NaN:v,z.coerce.number().min(0).max(70)),employer:optional,subjects:text(2),classes:text(2),days:text(2,200),times:text(2,200),timezone:text(1,100),onlineExperience:text(2),platforms:optional,motivation:text(20,2000),strengths:text(20,2000),engagement:text(20,2000),mentorship:text(20,2000),portfolio:optional,consent,website:z.string().max(0).optional()});
export const contactSchema=z.object({name:text(2,120),email,phone:optional,subject:text(2,150),message:text(10,3000),consent,website:z.string().max(0).optional()});
