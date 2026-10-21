// المركز التفصيلي لكل لاعب (أسلوب eFootball). عدّله هنا ثم شغّل:  npm run gen:data
// الأكواد: GK حارس • CB قلب دفاع • LB ظهير أيسر • RB ظهير أيمن • DMF وسط مدافع • CMF وسط
//          LMF وسط أيسر • RMF وسط أيمن • AMF وسط مهاجم • LWF جناح أيسر • RWF جناح أيمن • SS مهاجم ثانٍ • CF رأس حربة
export const POSITIONS = {
  // ---- نجوم حاليون ----
  "Lionel Messi": "RWF", "Cristiano Ronaldo": "CF", "Kylian Mbappé": "LWF", "Erling Haaland": "CF", "Mohamed Salah": "RWF",
  "Neymar": "LWF", "Kevin De Bruyne": "AMF", "Luka Modrić": "CMF", "Jude Bellingham": "AMF", "Vinícius Júnior": "LWF",
  "Rodri": "DMF", "Lamine Yamal": "RWF", "Pedri": "CMF", "Robert Lewandowski": "CF", "Harry Kane": "CF",
  "Jamal Musiala": "AMF", "Virgil van Dijk": "CB", "Achraf Hakimi": "RB", "Son Heung-min": "LWF", "Riyad Mahrez": "RWF",
  "Sadio Mané": "LWF", "Karim Benzema": "CF", "Antoine Griezmann": "SS", "Marcus Rashford": "LWF", "Bukayo Saka": "RWF",
  "Martin Ødegaard": "AMF", "Bruno Fernandes": "AMF", "Federico Valverde": "CMF", "Thibaut Courtois": "GK", "Manuel Neuer": "GK",
  "Alisson Becker": "GK", "Emiliano Martínez": "GK", "Yassine Bounou": "GK", "Sergio Ramos": "CB", "Antonio Rüdiger": "CB",
  "Thiago Silva": "CB", "Khvicha Kvaratskhelia": "LWF", "Victor Osimhen": "CF", "Lautaro Martínez": "CF", "Julián Álvarez": "SS",
  "Ousmane Dembélé": "RWF", "Eden Hazard": "LWF", "Paul Pogba": "CMF", "Enzo Fernández": "CMF", "Cole Palmer": "AMF",
  "Florian Wirtz": "AMF", "Alexis Mac Allister": "CMF", "Amine Adli": "LWF", "Ibrahima Konaté": "CB", "William Saliba": "CB",
  "Gianluigi Donnarumma": "GK",
  // ---- أساطير معتزلون ----
  "Zinedine Zidane": "AMF", "Ronaldinho": "AMF", "Diego Maradona": "SS", "Pelé": "SS", "Andrés Iniesta": "CMF", "Xavi": "CMF",
  "Thierry Henry": "LWF", "Ronaldo Nazário": "CF", "Gianluigi Buffon": "GK", "Paolo Maldini": "CB", "Rabah Madjer": "CF",
  "Lakhdar Belloumi": "AMF", "Johan Cruyff": "SS", "Franz Beckenbauer": "CB", "Michel Platini": "AMF", "Zico": "AMF",
  "Roberto Baggio": "SS", "Francesco Totti": "SS", "Alessandro Del Piero": "SS", "Andrea Pirlo": "DMF", "Cafu": "RB",
  "Roberto Carlos": "LB", "Kaká": "AMF", "Rivaldo": "SS", "Romário": "CF", "David Beckham": "RMF", "Steven Gerrard": "CMF",
  "Frank Lampard": "CMF", "Wayne Rooney": "CF", "Paul Scholes": "CMF", "John Terry": "CB", "Alan Shearer": "CF", "Gary Lineker": "CF",
  "Bobby Charlton": "AMF", "Ryan Giggs": "LMF", "Gareth Bale": "RWF", "Roy Keane": "DMF", "Raúl": "CF", "Iker Casillas": "GK",
  "Carles Puyol": "CB", "Fernando Torres": "CF", "David Villa": "CF", "Xabi Alonso": "DMF", "Gerard Piqué": "CB",
  "Lothar Matthäus": "CMF", "Miroslav Klose": "CF", "Philipp Lahm": "RB", "Bastian Schweinsteiger": "CMF", "Oliver Kahn": "GK",
  "Gerd Müller": "CF", "Michael Ballack": "CMF", "Toni Kroos": "CMF", "Mesut Özil": "AMF", "Zlatan Ibrahimović": "CF",
  "Henrik Larsson": "CF", "Peter Schmeichel": "GK", "Michael Laudrup": "AMF", "Didier Drogba": "CF", "Yaya Touré": "CMF",
  "Samuel Eto'o": "CF", "Roger Milla": "CF", "George Weah": "CF", "Michael Essien": "DMF", "Jay-Jay Okocha": "AMF",
  "Nwankwo Kanu": "CF", "Mohamed Aboutrika": "AMF", "Essam El-Hadary": "GK", "Salah Assad": "CF", "Rachid Mekhloufi": "CF",
  "Ali Benarbia": "AMF", "Noureddine Naybet": "CB", "Mustapha Hadji": "AMF", "Sami Al-Jaber": "CF", "Majed Abdullah": "CF",
  "Marco van Basten": "CF", "Ruud Gullit": "CMF", "Dennis Bergkamp": "SS", "Edwin van der Sar": "GK", "Arjen Robben": "RWF",
  "Wesley Sneijder": "AMF", "Luís Figo": "RWF", "Eusébio": "CF", "Gabriel Batistuta": "CF", "Juan Román Riquelme": "AMF",
  "Javier Zanetti": "RB", "Mario Kempes": "CF", "Diego Forlán": "SS", "Carlos Valderrama": "CMF", "Davor Šuker": "CF",
  "Hristo Stoichkov": "LWF", "Gheorghe Hagi": "AMF", "Pavel Nedvěd": "LMF", "Petr Čech": "GK", "Andriy Shevchenko": "CF",
  "Nemanja Vidić": "CB", "Franco Baresi": "CB", "Fabio Cannavaro": "CB", "Gennaro Gattuso": "DMF", "Alessandro Nesta": "CB",
  "Giorgio Chiellini": "CB", "Patrick Vieira": "DMF", "Claude Makélélé": "DMF", "Eric Cantona": "SS", "Lilian Thuram": "CB",
  "Marcel Desailly": "CB", "Franck Ribéry": "LWF", "Just Fontaine": "CF", "Vincent Kompany": "CB",
};

export const BROAD = { GK: "GK", CB: "DF", LB: "DF", RB: "DF", DMF: "MF", CMF: "MF", LMF: "MF", RMF: "MF", AMF: "MF", LWF: "FW", RWF: "FW", SS: "FW", CF: "FW" };
