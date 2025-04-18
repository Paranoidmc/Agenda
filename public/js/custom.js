// Script per modificare i testi dei pulsanti e link in italiano
document.addEventListener('DOMContentLoaded', function() {
    // Mappa delle traduzioni (inglese -> italiano)
    const translations = {
        'Cancel': 'Esci',
        'Delete': 'Elimina',
        'Save': 'Salva',
        'Save changes': 'Salva',
        'Edit': 'Modifica',
        'View': 'Leggi',
        'List': 'Elenco',
        'Activities': 'Attività',
        'Activity': 'Attività',
        'activity': 'attività',
        'activities': 'attività'
    };
    
    // Funzione per modificare i testi dei pulsanti e link
    function updateButtonTexts() {
        // Funzione di traduzione comune per tutti gli elementi
        function translateElement(element) {
            const text = element.textContent.trim();
            
            // Traduzioni esatte
            if (translations[text]) {
                element.textContent = translations[text];
                return;
            }
            
            // Gestione speciale per "New X" -> "Nuovo X"
            if (text.startsWith('New ')) {
                element.textContent = 'Nuovo ' + text.substring(4);
                return;
            }
            
            // Gestione speciale per "Edit X" -> "Modifica X"
            if (text.startsWith('Edit ')) {
                element.textContent = 'Modifica ' + text.substring(5);
                return;
            }
            
            // Gestione speciale per "X List" -> "X Elenco"
            if (text.endsWith(' List')) {
                element.textContent = text.substring(0, text.length - 5) + ' Elenco';
                return;
            }
            
            // Gestione speciale per parole all'interno del testo
            let newText = text;
            
            // Sostituisci "Activities" con "Attività" (case sensitive)
            newText = newText.replace(/\bActivities\b/g, 'Attività');
            newText = newText.replace(/\bActivity\b/g, 'Attività');
            newText = newText.replace(/\bactivities\b/g, 'attività');
            newText = newText.replace(/\bactivity\b/g, 'attività');
            
            // Sostituisci "Edit" con "Modifica" quando è una parola isolata
            newText = newText.replace(/\bEdit\b/g, 'Modifica');
            
            if (newText !== text) {
                element.textContent = newText;
            }
        }
        
        // Trova tutti i pulsanti
        document.querySelectorAll('button').forEach(translateElement);
        
        // Trova tutti i link
        document.querySelectorAll('a').forEach(translateElement);
        
        // Trova tutti gli span che potrebbero contenere testo da tradurre
        document.querySelectorAll('span').forEach(translateElement);
        
        // Trova tutti gli elementi h1, h2, h3, etc.
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(translateElement);
        
        // Trova tutti gli elementi div che potrebbero contenere testo
        document.querySelectorAll('div').forEach(translateElement);
        
        // Trova tutti gli elementi label
        document.querySelectorAll('label').forEach(translateElement);
    }
    
    // Esegui subito
    updateButtonTexts();
    
    // Osserva le modifiche al DOM per catturare nuovi elementi aggiunti dinamicamente
    const observer = new MutationObserver(function(mutations) {
        updateButtonTexts();
    });
    
    // Osserva l'intero documento per modifiche
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
});