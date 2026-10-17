// Donne à chaque image son nom (slide-1.png, …, carrousel-canva.pdf) et garde l'id de la tâche ClickUp.
return $input.all().map((item, i) => {
  const infos = $('8. Preparer les slides').all()[i].json;
  item.binary.fichier.fileName = infos.nom;
  item.binary.fichier.mimeType = infos.nom.endsWith('.pdf') ? 'application/pdf' : 'image/png';
  item.json = infos;
  return item;
});
