const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const backendDir = path.resolve(__dirname, '..');
const envFile = fs.existsSync(path.join(backendDir, '.env')) ? '.env' : '.env.development';
dotenv.config({ path: path.join(backendDir, envFile) });

const prisma = require('../src/config/prisma');

const SINGLE_FIRST_NAMES = [
  // Male
  'Gabriel', 'Rafael', 'Lorenzo', 'Miguel', 'Paolo', 'Jerome', 'Nathaniel', 'Adrian',
  'Christian', 'Vincent', 'Francis', 'Dominic', 'Kenneth', 'Joshua', 'Carlo', 'Marco',
  'Daniel', 'Patrick', 'Anthony', 'Martin', 'Mateo', 'Andres', 'Alfonso', 'Arturo',
  'Benedict', 'Bernard', 'Cesar', 'Dante', 'Eduardo', 'Emilio', 'Enrique', 'Ernesto',
  'Esteban', 'Federico', 'Felipe', 'Fernando', 'Gerardo', 'Gregorio', 'Hector', 'Ignacio',
  'Ismael', 'Jaime', 'Javier', 'Joaquin', 'Jorge', 'Julio', 'Leandro', 'Leonardo',
  'Manuel', 'Mariano', 'Mauricio', 'Nestor', 'Nicolas', 'Orlando', 'Oscar', 'Pablo',
  'Pedro', 'Ramon', 'Raul', 'Renato', 'Ricardo', 'Roberto', 'Rodolfo', 'Rodrigo',
  'Rolando', 'Romeo', 'Ruben', 'Salvador', 'Samuel', 'Santiago', 'Sergio', 'Teodoro',
  'Tomas', 'Vicente', 'Victor', 'Wilfredo', 'Aaron', 'Abel', 'Adam', 'Aidan',
  'Alan', 'Albert', 'Alec', 'Alex', 'Alexander', 'Alfred', 'Allan', 'Alvin',
  'Andre', 'Andrew', 'Angelo', 'Anton', 'Archie', 'Ariel', 'Arnel', 'Arnold',
  'Arthur', 'Austin', 'Avery', 'Barry', 'benjamin', 'Blake', 'Bradley', 'Brandon',
  'Brent', 'Brian', 'Bruce', 'Bryan', 'Bryce', 'Caleb', 'Calvin', 'Cameron',
  'Carl', 'Carlos', 'Cedric', 'Charles', 'Chase', 'Chester', 'Chris', 'Clarence',
  'Clark', 'Clayton', 'Clifford', 'Clyde', 'Cody', 'Cole', 'Colin', 'Connor',
  'Conrad', 'Corey', 'Craig', 'Crispin', 'Curtis', 'Cyrus', 'Dale', 'Damian',
  'Danilo', 'Darren', 'Daryl', 'David', 'Dean', 'Dennis', 'Derek', 'Derrick',
  'Desmond', 'Devin', 'Dexter', 'Diego', 'Dion', 'Donato', 'Donovan', 'Douglas',
  'Drew', 'Dustin', 'Dwayne', 'Dwight', 'Dylan', 'Earl', 'Edgar', 'Edison',
  'Edmond', 'Edward', 'Edwin', 'Efraim', 'Elijah', 'Elliot', 'Elmer', 'Elvin',
  'Elvis', 'Emmanuel', 'Eric', 'Erick', 'Erwin', 'Ethan', 'Eugene', 'Evan',
  'Ezekiel', 'Ezra', 'Fabian', 'Felix', 'Ferdinand', 'Fidel', 'Floyd', 'Franklin',
  'Frederick', 'Gael', 'Gareth', 'Garrett', 'Gary', 'Gavin', 'Gene', 'Geoffrey',
  'George', 'Gerald', 'Gideon', 'Gilbert', 'Gilberto', 'Glenn', 'Godfrey', 'Gordon',
  'Graham', 'Grant', 'Grayson', 'Gregory', 'Griffin', 'Guillermo', 'Gustavo', 'Harold',
  'Harrison', 'Harry', 'Harvey', 'Hayden', 'Heath', 'Henry', 'Herbert', 'Herman',
  'Homer', 'Horace', 'Howard', 'Hubert', 'Hudson', 'Hugh', 'Hugo', 'Hunter',
  'Ian', 'Ibrahim', 'Iker', 'Irvin', 'Irving', 'Isaac', 'Isaiah', 'Ivan',
  'Ivor', 'Jace', 'Jack', 'Jackson', 'Jacob', 'Jaden', 'Jairo', 'Jake',
  'James', 'Jared', 'Jarvis', 'Jason', 'Jasper', 'Jay', 'Jayden', 'Jayson',
  'Jed', 'Jefferson', 'Jeffrey', 'Jerald', 'Jeremiah', 'Jeremy', 'Jermaine', 'Jerry',
  'Jesse', 'Jethro', 'Jett', 'Jimmy', 'Jiro', 'Joel', 'Joey', 'Johan',
  // Female
  'Camille', 'Clarissa', 'Bianca', 'Patricia', 'Andrea', 'Katrina', 'Samantha', 'Mikaela',
  'Therese', 'Danica', 'Beatrice', 'Kirsten', 'Isabelle', 'Pauline', 'Nicole', 'Elaine',
  'Celine', 'Hannah', 'Sophia', 'Angela', 'Abigail', 'Adelaide', 'Adele', 'Adriana',
  'Agatha', 'Agnes', 'Aileen', 'Aimee', 'Aisha', 'Alana', 'Alejandra', 'Alexa',
  'Alexandra', 'Alexis', 'Alice', 'Alicia', 'Alina', 'Alison', 'Althea', 'Alyssa',
  'Amanda', 'Amara', 'Amber', 'Amelia', 'Amelie', 'Amina', 'Amy', 'Anabel',
  'Anastasia', 'Angel', 'Angelica', 'Angelina', 'Angeline', 'Anita', 'Annalyn', 'Anne',
  'Annette', 'Annie', 'Antoinette', 'Antonette', 'April', 'Arabella', 'Araceli', 'Ariana',
  'Arielle', 'Arlene', 'Ashley', 'Astrid', 'Athena', 'Aubrey', 'Audrey', 'Aurelia',
  'Aurora', 'Autumn', 'Ava', 'Avelina', 'Barbara', 'Belen', 'Belinda', 'Bella',
  'Bernadette', 'Bernice', 'Bethany', 'Bettina', 'Beverly', 'Blanca', 'Bonnie', 'Brenda',
  'Brianna', 'Bridget', 'Brittany', 'Brooke', 'Caitlin', 'Callie', 'Candice', 'Cara',
  'Carina', 'Carla', 'Carlota', 'Carmela', 'Carmelita', 'Carmen', 'Carol', 'Carolina',
  'Caroline', 'Carolyn', 'Carrie', 'Cassandra', 'Cassidy', 'Catalina', 'Catherine', 'Cecile',
  'Cecilia', 'Celeste', 'Celina', 'Chantal', 'Charlene', 'Charlotte', 'Charmaine', 'Chelsea',
  'Cherie', 'Cherry', 'Cheryl', 'Cheyenne', 'Chloe', 'Christabel', 'Christelle', 'Christina',
  'Christine', 'Cindy', 'Claire', 'Clara', 'Claudette', 'Claudia', 'Claudine', 'Cleo',
  'Colette', 'Colleen', 'Concepcion', 'Connie', 'Constance', 'Cora', 'Coraline', 'Corazon',
  'Corinne', 'Criselda', 'Cristina', 'Crystal', 'Cynthia', 'Dahlia', 'Daisy', 'Dakota',
  'Dalia', 'Dana', 'Daniela', 'Daniella', 'Danielle', 'Daphne', 'Darlene', 'Darna',
  'Dawn', 'Deanna', 'Debbie', 'Deborah', 'Debra', 'Delia', 'Delilah', 'Denise',
  'Desiree', 'Destiny', 'Diana', 'Diane', 'Dianna', 'Dianne', 'Dina', 'Divina',
  'Dolores', 'Dominique', 'Donna', 'Dora', 'Doreen', 'Doris', 'Dorothy', 'Dulce',
  'Eden', 'Edith', 'Edna', 'Eileen', 'Eleanor', 'Elena', 'Eliana', 'Elisa',
  'Elisabeth', 'Elise', 'Eliza', 'Elizabeth', 'Ella', 'Elle', 'Ellen', 'Eloisa',
  'Elsa', 'Elsie', 'Elvira', 'Emelda', 'Emilia', 'Emily', 'Emma', 'Emmeline',
  'Erica', 'Erika', 'Erin', 'Erlinda', 'Esmeralda', 'Estela', 'Estelle', 'Esther',
  'Estrella', 'Ethel', 'Eunice', 'Eva', 'Evangeline', 'Eve', 'Evelyn', 'Faith',
  'Fatima', 'Faye', 'Felicia', 'Felicity', 'Fe', 'Fernanda', 'Fiona', 'Flordeliza',
  'Florence', 'Florinda', 'Frances', 'Francesca', 'Francine', 'Freya', 'Frida', 'Gabriela',
  'Gabriella', 'Gabrielle', 'Gail', 'Gemma', 'Genevieve', 'Georgia', 'Georgina', 'Geraldine',
  'Gina', 'Giselle', 'Gladys', 'Glenda', 'Gloria', 'Grace', 'Graciela', 'Gretchen',
  'Guadalupe', 'Gwen', 'Gwendolyn', 'Hailey', 'Haley', 'Harmony', 'Harper', 'Hazel',
  'Heather', 'Heidi', 'Helen', 'Helena', 'Helene', 'Henrietta', 'Hilda', 'Holly',
  'Hope', 'Ida', 'Ilda', 'Ilona', 'Imelda', 'Ina', 'Ines', 'Ingrid',
  'Irene', 'Iris', 'Irma', 'Isabel', 'Isabela', 'Isabella', 'Ivory', 'Ivy',
  'Jacinta', 'Jackie', 'Jaclyn', 'Jacqueline', 'Jade', 'Jamie', 'Jana', 'Jane',
  'Janelle', 'Janet', 'Janette', 'Janice', 'Janine', 'Jasmine', 'Jean', 'Jeanette',
  'Jeanne', 'Jeannine', 'Jemima', 'Jenifer', 'Jenna', 'Jennifer', 'Jenny', 'Jeraldine',
  'Jessa', 'Jessica', 'Jessie', 'Jewel', 'Jillian', 'Jocelyn', 'Jodi', 'Jodie',
  'Joanna', 'Joanne', 'Jolina', 'Jolyn', 'Jonalyn', 'Jordan', 'Josefina', 'Josephine',
  'Josie', 'Jovelyn', 'Jovita', 'Joy', 'Joyce', 'Joycelyn', 'Juana', 'Juanita',
  'Judith', 'Judy', 'Julia', 'Juliana', 'Julianne', 'Julie', 'Juliet', 'Julieta',
  'June', 'Justine', 'Kaila', 'Kaitlyn', 'Karen', 'Karina', 'Karla', 'Kate',
  'Katelyn', 'Katherine', 'Kathleen', 'Kathryn', 'Kathy', 'Katie', 'Kay', 'Kaye',
  'Kayla', 'Kaylee', 'Keiko', 'Keisha', 'Kelly', 'Kelsey', 'Kendra', 'Kennedy',
  'Kerry', 'Kezia', 'Khloe', 'Kiara', 'Kim', 'Kimberly', 'Kira', 'Krista',
  'Kristel', 'Kristen', 'Kristin', 'Kristina', 'Kristine', 'Krystal', 'Kyla', 'Kylie',
  'Kyra', 'Laila', 'Lana', 'Lara', 'Larissa', 'Laura', 'Laurel', 'Lauren',
  'Laurie', 'Laverne', 'Layla', 'Lea', 'Leah', 'Leila', 'Leilani', 'Lena',
  'Lenore', 'Leona', 'Leonora', 'Leslie', 'Leticia', 'Lexi', 'Lia', 'Liana',
  'Lianne', 'Libby', 'Liberty', 'Lidia', 'Ligaya', 'Lila', 'Lilia', 'Lilian',
  'Liliana', 'Lillian', 'Lilly', 'Lily', 'Lina', 'Linda', 'Lindsay', 'Lindsey',
  'Lisa', 'Liza', 'Loida', 'Lola', 'Lolita', 'Lora', 'Loraine', 'Lorelei',
  'Lorena', 'Loretta', 'Lorna', 'Lorraine', 'Lottie', 'Louisa', 'Louise', 'Lourdes',
  'Lovely', 'Lucia', 'Luciana', 'Lucille', 'Lucinda', 'Lucy', 'Luisa', 'Lulu',
  'Luna', 'Luz', 'Luzviminda', 'Lydia', 'Lyka', 'Lynda', 'Lynette', 'Lynn',
  'Lynne', 'Lyra', 'Mabel', 'Mackenzie', 'Madeline', 'Madelyn', 'Madison', 'Madonna',
  'Mae', 'Maeve', 'Magdalena', 'Maggie', 'Maia', 'Maida', 'Maisie', 'Malaya',
  'Mallory', 'Mandy', 'Mara', 'Marcela', 'Marcelina', 'Marcia', 'Margarita', 'Margaux',
  'Margie', 'Margo', 'Margot', 'Maria', 'Mariah', 'Mariam', 'Marian', 'Mariana',
  'Mariane', 'Marianne', 'Maribel', 'Maricar', 'Maricel', 'Maricris', 'Marie', 'Mariel',
  'Marielle', 'Marife', 'Marigold', 'Marilou', 'Marilyn', 'Marina', 'Marinel', 'Mariposa',
  'Marisa', 'Marisol', 'Marissa', 'Marites', 'Maritess', 'Marivic', 'Marjorie', 'Marla',
  'Marlene', 'Marsha', 'Marta', 'Martha', 'Martina', 'Mary', 'Matilda', 'Maura',
  'Maureen', 'Mavis', 'Maxine', 'May', 'Maya', 'Mayra', 'Meagan', 'Megan',
  'Meghan', 'Mei', 'Melanie', 'Melba', 'Melinda', 'Melissa', 'Melody', 'Mercedes',
  'Mercy', 'Meredith', 'Mia', 'Micaela', 'Micah', 'Michaela', 'Michele', 'Michelle',
  'Mila', 'Milagros', 'Mildred', 'Millicent', 'Mina', 'Mindy', 'Minerva', 'Mira',
  'Mirabel', 'Miracle', 'Miranda', 'Miriam', 'Misty', 'Moira', 'Molly', 'Mona',
  'Monica', 'Monique', 'Morgan', 'Muriel', 'Myra', 'Myrna', 'Nadia', 'Nadine',
  'Nadine', 'Nancy', 'Naomi', 'Natalia', 'Natalie', 'Natasha', 'Nathalie', 'Natividad',
  'Nelda', 'Nelia', 'Nellie', 'Nena', 'Nenita', 'Nessa', 'Nica', 'Nichole',
  'Nicki', 'Nicky', 'Nida', 'Nikita', 'Nikki', 'Nila', 'Nina', 'Noelle',
  'Noemi', 'Nola', 'Nona', 'Nora', 'Noreen', 'Norma', 'Nova', 'Nydia',
  'Odette', 'Ofelia', 'Olga', 'Olive', 'Olivia', 'Opal', 'Ophelia', 'Oriana',
  'Paige', 'Paloma', 'Pamela', 'Pansy', 'Paola', 'Patience', 'Patsy', 'Patty',
  'Paula', 'Paulette', 'Paulina', 'Paz', 'Pearl', 'Pearly', 'Peggy', 'Penelope',
  'Penny', 'Perla', 'Perlita', 'Petra', 'Peyton', 'Phoebe', 'Pia', 'Pilar',
  'Piper', 'Polly', 'Poppy', 'Portia', 'Precious', 'Pricilla', 'Primrose', 'Princess',
  'Priscilla', 'Prudence', 'Queenie', 'Quinn', 'Rachael', 'Rachel', 'Rachelle', 'Rafaela',
  'Raina', 'Raisa', 'Ramona', 'Raquel', 'Raven', 'Raya', 'Rea', 'Reagan',
  'Rebecca', 'Rebekah', 'Reese', 'Regine', 'Regina', 'Reina', 'Remedios', 'Rena',
  'Renata', 'Renee', 'Rhea', 'Rhian', 'Rhiannon', 'Rhoda', 'Rhonda', 'Ria',
  'Rica', 'Richelle', 'Rina', 'Rita', 'Riza', 'Rizalina', 'Roberta', 'Robin',
  'Robyn', 'Rochelle', 'Rocio', 'Roda', 'Romina', 'Rona', 'Ronalyn', 'Ronda',
  'Rosa', 'Rosalie', 'Rosalina', 'Rosalind', 'Rosalinda', 'Rosalyn', 'Rosanna', 'Rosario',
  'Rose', 'Roselle', 'Rosemarie', 'Rosemary', 'Rosenda', 'Rosetta', 'Rosie', 'Rosita',
  'Rowena', 'Roxanne', 'Roxy', 'Ruby', 'Rufa', 'Rufina', 'Ruth', 'Sabina',
  'Sabrina', 'Sade', 'Sadie', 'Saffron', 'Sage', 'Salome', 'Salud', 'Samara',
  'Sandra', 'Sandy', 'Sanya', 'Sapphire', 'Sara', 'Sarah', 'Sarina', 'Sasha',
  'Savannah', 'Scarlett', 'Selena', 'Selene', 'Selina', 'Selma', 'Serafina', 'Serena',
  'Serenity', 'Shaina', 'Shaira', 'Shakira', 'Shana', 'Shania', 'Shanna', 'Shannon',
  'Shantel', 'Shari', 'Sharla', 'Sharlene', 'Sharon', 'Sharyl', 'Shauna', 'Shawna',
  'Shayla', 'Shayna', 'Shea', 'Sheena', 'Sheila', 'Shelby', 'Shelia', 'Shelley',
  'Shelly', 'Sheri', 'Sheridan', 'Sherri', 'Sherrie', 'Sherry', 'Sheryl', 'Shiela',
  'Shiloh', 'Shirley', 'Shy', 'Sienna', 'Sierra', 'Silvia', 'Simone', 'Sindy',
  'Siobhan', 'Skye', 'Skylar', 'Sloane', 'Socorro', 'Sofia', 'Sol', 'Solana',
  'Soledad', 'Sonia', 'Sonja', 'Sonya', 'Sophie', 'Stacey', 'Staci', 'Stacie',
  'Stacy', 'Star', 'Stella', 'Stephanie', 'Stevie', 'Summer', 'Sunny', 'Susan',
  'Susana', 'Susanna', 'Susanne', 'Susie', 'Suzanne', 'Suzy', 'Sybil', 'Sydney',
  'Sylvia', 'Tabitha', 'Tala', 'Talia', 'Tamara', 'Tammy', 'Tania', 'Tanya',
  'Tara', 'Taryn', 'Tasha', 'Tatiana', 'Tatum', 'Tawny', 'Taylor', 'Tegan',
  'Teresita', 'Teri', 'Terra', 'Terri', 'Terrie', 'Terry', 'Tess', 'Tessa',
  'Thalia', 'Thea', 'Thelma', 'Theodora', 'Theresa', 'Tia', 'Tiana', 'Tiara',
  'Tiffany', 'Tina', 'Tisha', 'Toni', 'Tonia', 'Tonya', 'Tori', 'Tracey',
  'Traci', 'Tracie', 'Tracy', 'Tricia', 'Trina', 'Trinity', 'Trisha', 'Trista',
  'Trixie', 'Trudy', 'Uma', 'Ursula', 'Valentina', 'Valeria', 'Valerie', 'Vanessa',
  'Veda', 'Velma', 'Venice', 'Venus', 'Vera', 'Veronica', 'Vicki', 'Vickie',
  'Vicky', 'Victoria', 'Vida', 'Vienna', 'Vina', 'Viola', 'Violet', 'Violeta',
  'Violetta', 'Virginia', 'Virma', 'Vivian', 'Viviana', 'Vivienne', 'Wanda', 'Wendy',
  'Whitney', 'Willa', 'Willow', 'Wilma', 'Winnie', 'Winona', 'Winter', 'Wren',
  'Xandra', 'Xena', 'Ximena', 'Xiomara', 'Yael', 'Yana', 'Yara', 'Yasmin',
  'Yasmine', 'Yesenia', 'Yna', 'Yolanda', 'Ysa', 'Ysabel', 'Yuki', 'Yumi',
  'Yvette', 'Yvonne', 'Zahara', 'Zaira', 'Zara', 'Zaria', 'Zelda', 'Zelma',
  'Zenaida', 'Zendaya', 'Zenia', 'Zinnia', 'Zoe', 'Zoey', 'Zora', 'Zoraida',
  'Zuri', 'Zyla',
];

const COMPOUND_PREFIXES_M = ['John', 'Mark', 'Jose', 'Juan', 'Karl', 'Paul', 'Luis', 'Jan', 'Ray', 'Neil'];
const COMPOUND_MIDDLES_M = ['Carlo', 'Angelo', 'Miguel', 'Rafael', 'David', 'Patrick', 'Lloyd', 'Vincent', 'Edward', 'Joseph', 'Daniel', 'Francis', 'Adrian', 'Christian', 'Gabriel', 'Kenneth', 'Dominic', 'Jerome', 'Marco', 'Paolo'];

const COMPOUND_PREFIXES_F = ['Maria', 'Mary', 'Anna', 'Rose', 'Jean', 'Joy', 'Mae', 'Grace', 'Anne', 'Jane'];
const COMPOUND_MIDDLES_F = ['Clara', 'Sofia', 'Louise', 'Claire', 'Grace', 'Nicole', 'Therese', 'Bianca', 'Camille', 'Isabel', 'Beatrice', 'Pauline', 'Andrea', 'Elaine', 'Celine', 'Hannah', 'Angela', 'Katrina', 'Samantha', 'Mikaela'];

const LAST_NAMES = [
  'Villanueva', 'Mendoza', 'Castillo', 'Ramos', 'Soriano', 'Alvarez', 'Navarro', 'Bautista',
  'Ocampo', 'Delgado', 'Salazar', 'Guerrero', 'Pascual', 'Aquino', 'Herrera', 'Mercado',
  'Jimenez', 'Valdez', 'Miranda', 'Cortez', 'Santiago', 'Estrada', 'Aguilar', 'Morales',
  'Tiongco', 'Lacson', 'Montelibano', 'Gamboa', 'Lizares', 'Yulo', 'Gonzales', 'Fernandez',
  'Torres', 'Flores', 'Rivera', 'Reyes', 'Cruz', 'Santos', 'Garcia', 'Lopez',
  'Diaz', 'Perez', 'Sanchez', 'Romero', 'Vargas', 'Castro', 'Ortega', 'Silva',
  'Cabrera', 'Campos', 'Vega', 'Rojas', 'Medina', 'Nunez', 'Ibarra', 'Pineda',
  'Serrano', 'Fuentes', 'Carrasco', 'Ponce', 'Lozano', 'Escobar', 'Velasco', 'Bustos',
  'Dizon', 'Manalo', 'Tolentino', 'de Guzman', 'de Leon', 'del Rosario', 'Evangelista', 'Galang',
  'Ilagan', 'Javier', 'Ledesma', 'Macaraeg', 'Natividad', 'Osorio', 'Padilla', 'Quintero',
  'Regalado', 'Samson', 'Tanchoco', 'Umali', 'Velasquez', 'Yap', 'Zamora', 'Abad',
  'Alcantara', 'Arellano', 'Balagtas', 'Barrientos', 'Beltran', 'Bernardo', 'Borja', 'Buenaventura',
  'Calderon', 'Carreon', 'Catapang', 'Concepcion', 'Corpuz', 'Crisostomo', 'Cuevas', 'David',
  'Domingo', 'Enriquez', 'Espinosa', 'Estrella', 'Fajardo', 'Francisco', 'Gallego', 'Guevarra',
  'Guzman', 'Hernandez', 'Ignacio', 'Jacinto', 'Labrador', 'Lagman', 'Lapuz', 'Laurel',
];

function buildUniqueNamePool(reservedLower) {
  const pool = [];
  const seen = new Set(reservedLower);

  const tryAdd = (raw) => {
    const clean = raw.trim().replace(/\s+/g, ' ');
    const cap = clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const key = cap.toLowerCase();
    if (!cap || seen.has(key)) return;
    seen.add(key);
    pool.push(cap);
  };

  for (const n of SINGLE_FIRST_NAMES) tryAdd(n);
  for (const p of COMPOUND_PREFIXES_M) {
    for (const m of COMPOUND_MIDDLES_M) {
      if (p.toLowerCase() !== m.toLowerCase()) tryAdd(`${p} ${m}`);
    }
  }
  for (const p of COMPOUND_PREFIXES_F) {
    for (const m of COMPOUND_MIDDLES_F) {
      if (p.toLowerCase() !== m.toLowerCase()) tryAdd(`${p} ${m}`);
    }
  }

  return pool;
}

async function main() {
  const allAlumni = await prisma.alumni.findMany({
    select: { id: true, email: true, first_name: true, last_name: true },
    orderBy: { id: 'asc' },
  });

  const reservedFirstNames = new Set();
  const generated = [];

  for (const row of allAlumni) {
    const email = String(row.email || '').toLowerCase();
    if (email.startsWith('gen.')) {
      generated.push(row);
    } else if (row.first_name) {
      reservedFirstNames.add(row.first_name.trim().toLowerCase());
    }
  }

  const pool = buildUniqueNamePool(reservedFirstNames);
  if (pool.length < generated.length) {
    throw new Error(`Not enough unique first names (${pool.length}) for ${generated.length} generated alumni`);
  }

  console.log(`Assigning strictly unique first names to ${generated.length} generated alumni (pool size: ${pool.length})...`);

  // Bulk update in chunks of 100 using a single SQL UPDATE ... FROM (VALUES ...)
  const chunkSize = 100;
  for (let start = 0; start < generated.length; start += chunkSize) {
    const slice = generated.slice(start, start + chunkSize);
    const values = [];
    const params = [];
    let p = 1;

    for (let i = 0; i < slice.length; i++) {
      const idx = start + i;
      const row = slice[i];
      const newFirst = pool[idx];
      const newLast = LAST_NAMES[(idx * 13 + (idx % 7)) % LAST_NAMES.length];
      values.push(`($${p++}::int, $${p++}::text, $${p++}::text)`);
      params.push(row.id, newFirst, newLast);
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "alumni" AS a
       SET "first_name" = v.first_name,
           "last_name" = v.last_name
       FROM (VALUES ${values.join(', ')}) AS v(id, first_name, last_name)
       WHERE a.id = v.id`,
      ...params
    );
  }

  // Verify zero duplicate first_name values across all generated alumni
  const verify = await prisma.alumni.findMany({
    where: { email: { startsWith: 'gen.' } },
    select: { first_name: true },
  });
  const uniqueSet = new Set(verify.map((v) => v.first_name.trim().toLowerCase()));
  console.log(`Verified: ${verify.length} generated alumni, ${uniqueSet.size} unique first names (duplicates: ${verify.length - uniqueSet.size}).`);
}

main()
  .catch((err) => {
    console.error('Failed to assign unique names:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
