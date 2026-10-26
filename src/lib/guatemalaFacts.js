/**
 * Fun facts for the back of the Home hero card — a new one on every flip.
 * Kept short (~120 chars) so they fit under the volcano without scrolling.
 */
export const GUATEMALA_FACTS = [
    {
        en: 'Lake Atitlán is the deepest lake in Central America: about 340 m at its deepest point.',
        es: 'El Lago de Atitlán es el más profundo de Centroamérica: unos 340 m en su punto más hondo.'
    },
    {
        en: 'The lake sits in a caldera left by a super-eruption about 84,000 years ago.',
        es: 'El lago está en una caldera que dejó una supererupción hace unos 84,000 años.'
    },
    {
        en: 'Guatemala has 37 volcanoes. Three are active: Fuego, Pacaya and Santiaguito.',
        es: 'Guatemala tiene 37 volcanes. Tres están activos: Fuego, Pacaya y Santiaguito.'
    },
    {
        en: 'Tajumulco, at 4,220 m, is the highest peak in all of Central America.',
        es: 'El Tajumulco, con 4,220 m, es la cumbre más alta de toda Centroamérica.'
    },
    {
        en: 'Volcán de Fuego puffs ash almost every day — you can watch it from Antigua.',
        es: 'El Volcán de Fuego lanza ceniza casi a diario; se ve desde Antigua.'
    },
    {
        en: 'On Pacaya, hikers roast marshmallows over the volcano’s own heat.',
        es: 'En el Pacaya, quienes lo suben asan malvaviscos con el calor del propio volcán.'
    },
    {
        en: 'The Maya drank cacao as a bitter, frothy drink and used cacao beans as money.',
        es: 'Los mayas tomaban cacao como bebida amarga y espumosa, y usaban sus granos como moneda.'
    },
    {
        en: 'The Maya used the number zero centuries before it reached Europe.',
        es: 'Los mayas usaban el cero siglos antes de que llegara a Europa.'
    },
    {
        en: 'More than 20 Maya languages are spoken in Guatemala today.',
        es: 'Hoy en Guatemala se hablan más de 20 idiomas mayas.'
    },
    {
        en: 'The quetzal is the national bird — and the name of the country’s currency.',
        es: 'El quetzal es el ave nacional y también el nombre de la moneda.'
    },
    {
        en: 'The national flower is the Monja Blanca, a rare white orchid.',
        es: 'La flor nacional es la Monja Blanca, una orquídea blanca muy escasa.'
    },
    {
        en: 'Temple IV at Tikal rises about 65 m — taller than most Maya pyramids ever built.',
        es: 'El Templo IV de Tikal mide unos 65 m, más que casi cualquier pirámide maya.'
    },
    {
        en: 'Antigua was the capital until earthquakes in 1773 moved it to today’s Guatemala City.',
        es: 'Antigua fue la capital hasta que los terremotos de 1773 la movieron a la actual Ciudad de Guatemala.'
    },
    {
        en: 'In Antigua’s Holy Week, streets are covered in carpets of dyed sawdust and flowers.',
        es: 'En la Semana Santa de Antigua, las calles se cubren de alfombras de aserrín teñido y flores.'
    },
    {
        en: 'On Nov 1, Sumpango flies giant kites, some over 15 m wide, to honor the dead.',
        es: 'El 1 de noviembre, en Sumpango vuelan barriletes gigantes, algunos de más de 15 m, para honrar a los difuntos.'
    },
    {
        en: 'Fiambre, eaten on All Saints’ Day, can mix over 50 ingredients in one dish.',
        es: 'El fiambre del Día de Todos los Santos puede llevar más de 50 ingredientes.'
    },
    {
        en: 'In Santiago Atitlán, the folk saint Maximón receives offerings of cigars and liquor.',
        es: 'En Santiago Atitlán, a Maximón le ofrecen puros y licor.'
    },
    {
        en: 'Worry dolls: tell them your troubles, put them under your pillow, and they keep them.',
        es: 'Muñecas quitapenas: les cuentas tus penas, las pones bajo la almohada y ellas se las quedan.'
    },
    {
        en: 'Chicken buses are retired US school buses, repainted in loud colors.',
        es: 'Las camionetas son antiguos buses escolares de EE. UU., repintados con colores vivos.'
    },
    {
        en: 'At Semuc Champey, a river vanishes under a limestone bridge topped by turquoise pools.',
        es: 'En Semuc Champey, un río desaparece bajo un puente de piedra caliza con pozas turquesa encima.'
    }
]

/** A random fact index, never the same as the one just shown. */
export function nextFactIndex(previous) {
    if (GUATEMALA_FACTS.length < 2) return 0
    let i
    do { i = Math.floor(Math.random() * GUATEMALA_FACTS.length) } while (i === previous)
    return i
}
