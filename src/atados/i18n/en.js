// English texts (D-102). Boss lines translate a draft: TODO review with Diego.
export default {
  "brasero.color.0": "red",
  "brasero.color.1": "blue",
  "brasero.color.2": "gold",
  "brasero.escudo": "Shared shield ({color}) · {tiempo} s",
  "indicacion.orbe":
    "Void · carry the orb to the marked pillar, then leave the circle.",
  "indicacion.luz": "Divine light · take cover in the shadow of an obstacle.",
  "indicacion.pisotonSolo": "Stomp · stand inside the marked circle.",
  "indicacion.pisoton": "Stomp · stand together inside the marked circle.",
  "indicacion.braseros":
    "Shots arrive in 4 s · step into the {color} brazier to shield both players for 3 s.",
  "indicacion.muneco":
    "Split up: the chain only cuts when taut. Sweep it through the dummy.",
  "indicacion.munecoPilar":
    "Nice. Now wrap the chain around a pillar and sweep from there.",
  "indicacion.mirra": "Sweep the taut chain through Mirra.",
  "indicacion.derrota": "Dash to retry.",
  "indicacion.siega": "Reap · get out of the scythe arc.",
  "indicacion.siega_doble": "Double reap · two passes: leave the arc.",
  "indicacion.grano": "Grain · find the gap between the marks.",
  "indicacion.hambre": "Hunger · leave the lane; a taut chain trips her.",
  "indicacion.enjambre": "Swarm · keep away from the cloud.",
  "indicacion.banquete": "Feast · run against the pull or anchor.",
  "jefe.muneco.nombre": "Straw Dummy",
  "jefe.muneco.antiguo": "practice",
  "jefe.muneco.presentacion":
    "Pull the chain taut and sweep it through the dummy.",
  "jefe.muneco.muerte": "“Now that was a cut!”",
  "jefe.muneco.burla": "“…”",
  "jefe.muneco.derrota": "“…”",
  "jefe.mirra.nombre": "Mirra, the Ravenous",
  "jefe.mirra.antiguo": "she who Nourished",
  "jefe.mirra.presentacion":
    "“I fed this valley for a thousand harvests. Now the valley feeds me.”",
  "jefe.mirra.muerte": "“Warm bread… I remember warm bread.”",
  "jefe.mirra.burla": "“One less at the table.”",
  "jefe.mirra.derrota": "“Thank you for the meal.”",

  "combate.saltar": "{dash} to skip",
  "combate.reintentar": "{dash} to retry",
  "combate.reiniciaRush": "Hard mode: the rush starts over",
  "combate.derrota": "You both fell",

  "lapida.titulo": "Here fell {jefe}",
  "lapida.tiempo": "Time",
  "lapida.dano": "Damage",
  "lapida.golpes": "Hits taken",
  "lapida.arrastres": "Drags",
  "lapida.sinDano": "Flawless",
  "drop.placeholder": "item (milestone 4)",
  "drop.extra": "flawless bonus",

  // HUD (milestone 3). Tutorial prompts and murals: UI DRAFT; mural lore text belongs to whoever writes the corridor.
  "tutorial.mover": "{mover} to move",
  "tutorial.corte": "Drag the taut chain through an enemy to cut it",
  "tutorial.ancla": "Hold {ancla} to anchor",
  "tutorial.dash": "{dash} to dash away",
  "mural.prueba": "PLACEHOLDER: test mural text.",
  // Climb corridor murals (D-126, D-209): DRAFT pending Diego's approval.
  "mural.ladrones":
    "“He climbed for gold. She, for her name. Fire rained down.”",
  "mural.urna": "“Seven sparks fell on seven gods. None on the thieves.”",
  "mural.mirra":
    "“First came the locusts, then the dust. She who Nourished no longer gives: she devours.”",

  // Tutorial cards (D-206, D-207): short title and one line. Third person so they work in solo and co-op;
  // the card adds the keys for the device in use.
  "tarjeta.mover.titulo": "Move",
  "tarjeta.mover.linea":
    "Sael and Odo are bound: when one pulls, the other gets dragged.",
  "tarjeta.cortar.titulo": "Pull taut, cut",
  "tarjeta.cortar.linea":
    "Split apart and the chain pulls taut, cutting what it crosses. Slack won't cut.",
  "tarjeta.ancla.titulo": "Anchor",
  "tarjeta.ancla.linea":
    "While held, one stays put and the other swings around them.",
  "tarjeta.dash.titulo": "Dash",
  "tarjeta.dash.linea": "A quick dodge: attacks can't hurt you mid-dash.",
  "tarjeta.enredo.titulo": "Wrap",
  "tarjeta.enredo.linea":
    "Circle a column: the chain wraps around it and stays taut for a sweep.",

  "tecla.Space": "Space",
  "tecla.ShiftLeft": "Left Shift",
  "tecla.ShiftRight": "Right Shift",
  "tecla.ControlLeft": "Left Ctrl",
  "tecla.ControlRight": "Right Ctrl",
  "tecla.Enter": "Enter",
  "tecla.NumpadEnter": "Enter",
  "tecla.Tab": "Tab",
  "tecla.Escape": "Esc",
  "tecla.stickIzq": "Left stick",
  "tecla.stickDer": "Right stick",

  "tienda.abrir": "Shop",
  "tienda.pausa": "Game paused",
  "tienda.titulo": "Completo cart",
  "tienda.nota": "Each item serves Sael and Odo. Defeat bosses to earn coins.",
  "tienda.moneda": "{cantidad} coin",
  "tienda.monedas": "{cantidad} coins",
  "tienda.recompensa": "Reward: +{cantidad}",
  "tienda.cerrar": "Back to game",
  "tienda.comprar": "Buy",
  "tienda.comprado": "Purchased",
  "tienda.italiano": "Completo italiano",
  "tienda.mote": "Mote con huesillos",
  "tienda.sopaipilla": "Sopaipilla",
  "tienda.efecto.italiano": "+250 health and maximum health.",
  "tienda.efecto.mote": "20% shorter dodge cooldown.",
  "tienda.efecto.sopaipilla": "0.4 s more protection after a hit.",

  "jugador.sael": "Sael",
  "jugador.odo": "Odo",
};

// Cartel del puesto: diálogo de Sael y Odo junto a la radio.
export const muralText = {
  stall: "Completo cart · El Trigal",
  radio: "Radio · 31 minutos",
  sael: "Did you steal the completo italiano cart too?",
  odo: "I only wanted one completo. The chain got caught!",
};
