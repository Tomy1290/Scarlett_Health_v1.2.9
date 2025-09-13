export type Cuisine = 'de'|'pl'|'it'|'gr'|'tr'|'us';
export type Meal = 'breakfast'|'lunch'|'dinner';
export type Category = 'fleisch'|'lowcarb'|'abnehmen'|'vegetarisch'|'kuchen'|'suesses';

export type Recipe = {
  id: string;
  cuisine: Cuisine;
  meal: Meal;
  category: Category;
  // Titles and short description per language
  title: { de: string; en: string; pl: string };
  desc: { de: string; en: string; pl: string };
  durationMin: number;
  kcal: number;
};

const CUISINES: Cuisine[] = ['de','pl','it','gr','tr','us'];
const MEALS: Meal[] = ['breakfast','lunch','dinner'];
const CATS: Category[] = ['fleisch','lowcarb','abnehmen','vegetarisch','kuchen','suesses'];

const BASE_DE: Record<Category, string[]> = {
  fleisch: ['Hähnchenpfanne','Rinderstreifen','Hackpfanne','Putenfilet','Schweinefilet','Schnitzel','Frikadellen','Fleischspieße','Gulasch schnell','Steakstreifen','Hackbällchen','Curry-Hähnchen','Gyros-Pfanne','Kebap-Teller'],
  lowcarb: ['Zucchini-Nudeln','Blumenkohlreis','Kohlrabi-Pommes','Ei-Wrap','Lachs mit Brokkoli','Thunfischsalat','Shakshuka','Griechischer Salat','Gefüllte Paprika','Auberginen-Schiffchen','Kohlrabi-Carbonara','Rinderfilet auf Spargel','Pilzpfanne','Huevos Rancheros'],
  abnehmen: ['Gemüsepfanne','Leichter Quark','Haferschale','Mageres Chili','Hähnchen aus dem Ofen','Linsensuppe','Tomatensuppe','Krautsalat','Forelle mit Salat','Ofengemüse','Joghurt mit Beeren','Thunfisch auf Salat','Brühe mit Gemüse','Zucchini-Suppe'],
  vegetarisch: ['Gemüseomelett','Pasta Arrabbiata','Tomate-Mozzarella','Falafel-Box','Griechischer Salat','Käse-Spätzle','Pilzrisotto','Ratatouille','Gemüse-Lasagne','Bohnen-Eintopf','Brokkoli-Kartoffel-Pfanne','Couscous-Salat','Caprese-Sandwich','Spinat-Feta-Pfanne'],
  kuchen: ['Rührkuchen','Apfelkuchen','Marmorkuchen','Schokokuchen','Zitronenkuchen','Käsekuchen','Karottenkuchen','Bananenbrot','Mohnkuchen','Brownies','Mandelkuchen','Muffins Vanille','Muffins Schoko','Russischer Zupfkuchen'],
  suesses: ['Grießbrei','Milchreis','Pfannkuchen','Waffeln','Joghurtcreme','Quarkdessert','Karamellpudding','Vanillepudding','Schoko-Creme','Obstsalat','Erdbeerquark','Bircher Müsli','Energy Balls','Schoko-Hafer-Becher'],
};

const BASE_EN: Record<Category, string[]> = {
  fleisch: ['Chicken skillet','Beef strips','Minced pan','Turkey fillet','Pork fillet','Schnitzel','Meatballs','Skewers','Quick goulash','Steak strips','Meat dumplings','Chicken curry','Gyros skillet','Kebab plate'],
  lowcarb: ['Zucchini noodles','Cauliflower rice','Kohlrabi fries','Egg wrap','Salmon & broccoli','Tuna salad','Shakshuka','Greek salad','Stuffed peppers','Eggplant boats','Kohlrabi carbonara','Beef & asparagus','Mushroom pan','Huevos Rancheros'],
  abnehmen: ['Veggie pan','Light quark','Oat bowl','Lean chili','Oven chicken','Lentil soup','Tomato soup','Cabbage salad','Trout & salad','Roasted veggies','Yogurt with berries','Tuna on salad','Clear broth veggies','Zucchini soup'],
  vegetarisch: ['Veg omelette','Pasta arrabbiata','Tomato mozzarella','Falafel box','Greek salad','Cheese spaetzle','Mushroom risotto','Ratatouille','Veg lasagna','Bean stew','Broccoli potato pan','Couscous salad','Caprese sandwich','Spinach feta pan'],
  kuchen: ['Pound cake','Apple pie','Marble cake','Chocolate cake','Lemon cake','Cheesecake','Carrot cake','Banana bread','Poppy seed cake','Brownies','Almond cake','Vanilla muffins','Chocolate muffins','Zupfkuchen'],
  suesses: ['Semolina pudding','Rice pudding','Pancakes','Waffles','Yogurt cream','Quark dessert','Caramel pudding','Vanilla pudding','Chocolate cream','Fruit salad','Strawberry quark','Bircher muesli','Energy balls','Choco-oat cup'],
};

const BASE_PL: Record<Category, string[]> = {
  fleisch: ['Patelnia z kurczakiem','Paski wołowe','Patelnia z mielonym','Filet z indyka','Polędwica wieprzowa','Sznycel','Klopsiki','Szaszłyki','Szybki gulasz','Paski stekowe','Pulpety','Kurczak curry','Patelnia gyros','Talerz kebab'],
  lowcarb: ['Makaron z cukinii','Ryż z kalafiora','Frytki z kalarepy','Zawijaniec jajeczny','Łosoś z brokułem','Sałatka z tuńczykiem','Szakszuka','Sałatka grecka','Faszerowana papryka','Łódki z bakłażana','Carbonara z kalarepy','Wołowina ze szparagami','Patelnia grzybowa','Huevos Rancheros'],
  abnehmen: ['Warzywna patelnia','Lekki twaróg','Miska owsiana','Lekkie chili','Kurczak z pieca','Zupa z soczewicy','Zupa pomidorowa','Sałatka z kapusty','Pstrąg z sałatą','Warzywa z pieca','Jogurt z owocami','Tuńczyk na sałacie','Bulion z warzywami','Zupa z cukinii'],
  vegetarisch: ['Omlet warzywny','Makaron arrabbiata','Pomidor mozzarella','Falafel box','Sałatka grecka','Käsespätzle (serowe)','Risotto grzybowe','Ratatouille','Lasagne warzywna','Gulasz z fasoli','Patelnia brokuł-ziemniak','Sałatka kuskus','Kanapka caprese','Patelnia szpinak-feta'],
  kuchen: ['Ciasto ucierane','Szarlotka','Ciasto marmurkowe','Ciasto czekoladowe','Ciasto cytrynowe','Sernik','Ciasto marchewkowe','Chlebek bananowy','Ciasto makowe','Brownie','Ciasto migdałowe','Muffiny waniliowe','Muffiny czekoladowe','Sernik „Zupfkuchen”'],
  suesses: ['Kasza manna na mleku','Ryż na mleku','Naleśniki','Gofry','Krem jogurtowy','Deser z twarogu','Budyń karmelowy','Budyń waniliowy','Krem czekoladowy','Sałatka owocowa','Twaróg truskawkowy','Musli birchera','Kulki mocy','Kubek z płatkami i kakao'],
};

function mkTitle(lang: 'de'|'en'|'pl', cat: Category, baseIdx: number) {
  return { de: BASE_DE[cat][baseIdx], en: BASE_EN[cat][baseIdx], pl: BASE_PL[cat][baseIdx] } as const;
}

export function generateRecipes(): Recipe[] {
  const out: Recipe[] = [];
  let idCounter = 1;
  for (const cuisine of CUISINES) {
    for (const meal of MEALS) {
      for (const cat of CATS) {
        // 14 Varianten je Kombination => 6*3*14 = 252 Rezepte
        for (let i = 0; i < 14; i++) {
          const idx = i % 14;
          const title = mkTitle('de', cat, idx);
          const titleAll = { de: title.de, en: BASE_EN[cat][idx], pl: BASE_PL[cat][idx] };
          const dur = 10 + ((i * 5 + (meal==='dinner'?10:0)) % 35); // 10..44
          const kcalBase = cat==='kuchen' || cat==='suesses' ? 420 : (cat==='abnehmen' ? 280 : 360);
          const kcal = kcalBase + ((i*17) % 120);
          const descAll = {
            de: `${titleAll.de} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Frühstück':meal==='lunch'?'Mittag':'Abend'} · ${dur} Min · ca. ${kcal} kcal.`,
            en: `${titleAll.en} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Breakfast':meal==='lunch'?'Lunch':'Dinner'} · ${dur} min · ~${kcal} kcal.`,
            pl: `${titleAll.pl} – ${cuisine.toUpperCase()} · ${meal==='breakfast'?'Śniadanie':meal==='lunch'?'Obiad':'Kolacja'} · ${dur} min · ok. ${kcal} kcal.`,
          };
          out.push({ id: `r${idCounter++}`, cuisine, meal, category: cat, title: titleAll, desc: descAll, durationMin: dur, kcal });
        }
      }
    }
  }
  return out;
}