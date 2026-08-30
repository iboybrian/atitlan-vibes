-- Cuándo el usuario tocó el TownPicker por última vez.
--
-- Sin esto, un pick es eterno: alguien que eligió Panajachel en marzo cuenta
-- como "está en Panajachel" para siempre, y un anunciante que paga por llegar a
-- ese pueblo compra una lista de gente que tocó un botón una vez.
--
-- Con esto, notify-town trata el pick como lo que es — una declaración con
-- fecha — y lo deja de contar a los 7 días SI hay una detección fresca que lo
-- contradiga. Si no hay señal de ubicación, el pick sigue valiendo aunque sea
-- viejo: es lo único que tenemos y silenciar a ese usuario sería peor.

alter table public.users
    add column if not exists current_town_set_at timestamptz;

-- Los usuarios existentes ya tienen un pick sin fecha. Ponerlos en now() los
-- arranca con los 7 días completos en vez de dejarlos en un estado nulo que
-- cada lectura tiene que interpretar.
update public.users
set current_town_set_at = now()
where current_town_id is not null
  and current_town_set_at is null;
