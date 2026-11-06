interface OpeningNode {
  name?: string;
  [move: string]: string | OpeningNode | undefined;
}

const tree: OpeningNode = {
  e4: {
    name: "King's Pawn Game",
    e5: {
      name: "King's Pawn Game",
      Nf3: {
        Nc6: { name: "King's Knight Opening" },
        Nf6: { name: "Petrov's Defense" },
        d6: { name: "Philidor Defense" },
        Bc5: { name: "Italian Game, Two Knights Variation" },
      },
      Bc4: {
        Bc5: { name: "Giuoco Piano" },
        Nf6: { name: "Two Knights Defense" },
        Nc6: { name: "Italian Game" },
      },
      f4: { name: "King's Gambit", exf4: { name: "King's Gambit Accepted" } },
      d4: { name: "Center Game", exd4: { name: "Center Game Accepted" } },
      Nc3: { name: "Vienna Game", Nf6: { name: "Vienna Game, Falkbeer Variation" } },
      Bb5: { name: "Portuguese Opening" },
      c6: { name: "Philidor Counter-Gambit" },
    },
    c5: { name: "Sicilian Defense" },
    e6: { name: "French Defense" },
    c6: { name: "Caro-Kann Defense" },
    d5: { name: "Scandinavian Defense", exd5: { name: "Scandinavian Defense, Center Counter" } },
    g6: { name: "Modern Defense" },
    Nf6: { name: "Alekhine's Defense" },
    d6: { name: "Pirc Defense" },
    a6: { name: "St. George Defense" },
    b6: { name: "Owen's Defense" },
    Nc6: { name: "Nimzowitsch Defense" },
    f5: { name: "Fred Defense" },
  },
  d4: {
    name: "Queen's Pawn Game",
    d5: {
      name: "Queen's Pawn Game",
      c4: {
        name: "Queen's Gambit",
        e6: { name: "Queen's Gambit Declined" },
        dxc4: { name: "Queen's Gambit Accepted" },
        c6: { name: "Slav Defense" },
        Nc6: { name: "Chigorin Defense" },
        Nf6: { name: "Marshall Defense" },
      },
      Nf3: { name: "Queen's Pawn Game" },
      e3: { name: "Colle System" },
      Bf4: { name: "London System" },
      g3: { name: "Catalan Opening (by transposition)" },
    },
    Nf6: {
      name: "Indian Game",
      c4: {
        g6: { name: "King's Indian Defense" },
        e6: { name: "Bogo-Indian Defense" },
        Bb4: { name: "Bogo-Indian Defense" },
        b6: { name: "Queen's Indian Defense" },
        d6: { name: "Old Indian Defense" },
        c5: { name: "Benoni Defense" },
        Nc6: { name: "Mexican Defense" },
      },
      Nf3: { name: "Indian Game" },
      g3: { name: "Fianchetto Indian" },
      Bg5: { name: "Trompowsky Attack" },
    },
    f5: { name: "Dutch Defense" },
    c5: { name: "Benoni Defense" },
    g6: { name: "Modern Defense" },
    Nc6: { name: "Queen's Knight Defense" },
    d6: { name: "Rat Defense" },
    e6: { name: "Horwitz Defense" },
    b6: { name: "English Defense" },
  },
  c4: {
    name: "English Opening",
    e5: { name: "English Opening, Reversed Sicilian" },
    c5: { name: "English Opening, Symmetrical" },
    Nf6: { name: "English Opening, Anglo-Indian" },
    e6: { name: "English Opening, Agincourt Defense" },
    g6: { name: "English Opening, Great Snake" },
    c6: { name: "English Opening, Caro-Kann Formation" },
  },
  Nf3: {
    name: "King's Pawn Opening (Reti)",
    d5: { name: "Reti Opening, Zukertort Variation" },
    Nf6: { name: "Zukertort Opening" },
    c5: { name: "Reti Opening" },
    g6: { name: "King's Fianchetto Opening" },
  },
  g3: { name: "King's Fianchetto Opening" },
  b3: { name: "Nimzowitsch-Larsen Attack" },
  f4: { name: "Bird's Opening" },
  b4: { name: "Polish Opening (Sokolsky)" },
  Nc3: { name: "Dunst Opening" },
  e3: { name: "Van 't Kruijs Opening" },
  c3: { name: "Saragossa Opening" },
  d3: { name: "Mieses Opening" },
  a3: { name: "Anderssen's Opening" },
  h3: { name: "Clemenz Opening" },
  a4: { name: "Ware Opening" },
  h4: { name: "Kádas Opening" },
  g4: { name: "Grob's Attack" },
  f3: { name: "Barnes Opening" },
  Nh3: { name: "Paris Opening" },
};

export function getOpeningName(moves: string[]): string {
  let node: OpeningNode = tree;
  let lastNamed = "";

  for (const move of moves) {
    if (node[move] && typeof node[move] === "object") {
      node = node[move] as OpeningNode;
      if (node.name) lastNamed = node.name;
    } else {
      break;
    }
  }

  return lastNamed;
}
