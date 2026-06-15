/**
 * @file app.js
 * @description Ce fichier gère la logique frontend de notre Proof of Concept (PoC).
 * Il s'occupe de la récupération des données du formulaire, de leur sauvegarde
 * dans le LocalStorage (pour simuler une base de données locale) et de leur
 * affichage dans l'interface utilisateur.
 */

// Écouteur d'événement global qui attend que tout le code HTML soit chargé
// avant d'exécuter nos scripts. C'est essentiel pour s'assurer que les éléments
// du DOM (Document Object Model) existent quand on essaie d'y accéder.
document.addEventListener('DOMContentLoaded', () => {
    
    // Récupération des éléments HTML via leur ID pour pouvoir interagir avec eux.
    const vulnForm = document.getElementById('vuln-form');
    const vulnList = document.getElementById('vuln-list');

    /**
     * @function chargerVulnerabilites
     * @description Récupère les données sauvegardées dans le LocalStorage et les affiche.
     * Cette fonction est appelée au démarrage de l'application et à chaque mise à jour.
     * Le LocalStorage ne stocke que du texte brut, c'est pourquoi nous utilisons
     * JSON.parse() pour retransformer la chaîne de caractères JSON en un tableau d'objets JavaScript.
     */
    function chargerVulnerabilites() {
        // 1. Récupération de la chaîne JSON depuis le LocalStorage avec la clé 'vulnerabilities'
        const vulnData = localStorage.getItem('vulnerabilities');
        
        // 2. Si des données existent, on les parse (convertit en tableau d'objets).
        // Sinon, on initialise un tableau vide [].
        const vulnerabilites = vulnData ? JSON.parse(vulnData) : [];

        // 3. On vide la liste HTML actuelle pour éviter les doublons lors du réaffichage.
        vulnList.innerHTML = '';

        // 4. On parcourt chaque vulnérabilité dans notre tableau
        vulnerabilites.forEach((vuln) => {
            // Création d'un nouvel élément de liste <li>
            const li = document.createElement('li');
            li.classList.add('vuln-item');
            
            // On injecte le contenu HTML dans l'élément, en utilisant les propriétés de l'objet
            li.innerHTML = `
                <strong>${vuln.titre}</strong>
                <p>${vuln.description}</p>
                <span class="severity sev-${vuln.severite}">${vuln.severite}</span>
            `;
            
            // On ajoute cet élément à la liste dans le DOM
            vulnList.appendChild(li);
        });
    }

    /**
     * @function sauvegarderVulnerabilite
     * @description Ajoute une nouvelle vulnérabilité au tableau existant et sauvegarde 
     * le tout dans le LocalStorage.
     * @param {Object} nouvelleVuln - L'objet contenant les informations (titre, sévérité, description)
     */
    function sauvegarderVulnerabilite(nouvelleVuln) {
        // 1. On récupère les données existantes (ou un tableau vide s'il n'y a rien)
        const vulnData = localStorage.getItem('vulnerabilities');
        const vulnerabilites = vulnData ? JSON.parse(vulnData) : [];

        // 2. On ajoute notre nouvelle vulnérabilité à la fin du tableau
        vulnerabilites.push(nouvelleVuln);

        // 3. On sauvegarde le tableau mis à jour dans le LocalStorage.
        // Étant donné que le LocalStorage n'accepte que des chaînes de caractères (strings),
        // on doit impérativement utiliser JSON.stringify() pour convertir notre tableau d'objets.
        localStorage.setItem('vulnerabilities', JSON.stringify(vulnerabilites));
    }

    // Gestionnaire d'événement déclenché lorsque l'utilisateur soumet le formulaire
    vulnForm.addEventListener('submit', (event) => {
        // Empêche le comportement par défaut du navigateur (qui rechargerait la page)
        event.preventDefault();

        // Récupération des valeurs saisies par l'utilisateur dans les champs du formulaire
        const titre = document.getElementById('title').value;
        const severite = document.getElementById('severity').value;
        const description = document.getElementById('description').value;

        // Création d'un objet JavaScript structurant ces données
        const nouvelleVuln = {
            titre: titre,
            severite: severite,
            description: description
        };

        // Appel de notre fonction pour sauvegarder cette nouvelle entrée
        sauvegarderVulnerabilite(nouvelleVuln);

        // Réinitialisation des champs du formulaire pour la prochaine saisie
        vulnForm.reset();

        // Mise à jour de l'affichage pour inclure la nouvelle vulnérabilité
        chargerVulnerabilites();
    });

    // Chargement initial des données lorsque la page est ouverte
    chargerVulnerabilites();
});
