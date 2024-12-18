// app.js

let nextPageToken = null;
let isLoading = false;

async function getEmails(pageToken = null) {
    try {
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(token);
                }
            });
        });

        // Construction de l'URL avec les paramètres
        let url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100';
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        nextPageToken = data.nextPageToken; // Sauvegarde du token pour la page suivante

        // Récupération des détails pour chaque email
        const emailDetails = await Promise.all(
            data.messages.map(async (message) => {
                const messageDetails = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                return messageDetails.json();
            })
        );

        return emailDetails;
    } catch (error) {
        console.error('Error fetching emails:', error);
    }
}

function renderEmailList(emails) {
    const container = document.getElementById('email-items');
    container.innerHTML = '';

    emails.forEach((email) => {
        const date = new Date(email.payload.headers.find(h => h.name === 'Date')?.value);
        const sender = email.payload.headers.find(h => h.name === 'From')?.value;
        const subject = email.payload.headers.find(h => h.name === 'Subject')?.value;
        const isUnread = email.labelIds?.includes('UNREAD');
        
        const emailElement = document.createElement('div');
        emailElement.className = `email-item ${isUnread ? 'unread' : ''}`;
        
        // Extraction du nom de l'expéditeur
        const senderName = sender.split('<')[0].trim().replace(/"/g, '') || sender;
        
        emailElement.innerHTML = `
            <div class="flex items-center space-x-4 w-full">
                <input type="checkbox" class="h-4 w-4 rounded border-gray-300">
                <button class="text-gray-400 hover:text-yellow-400">★</button>
                
                <div class="email-sender">${senderName}</div>
                
                <div class="email-content">
                    <div class="email-subject">${subject}</div>
                    <div class="email-snippet text-gray-600">
                        ${email.snippet}
                    </div>
                </div>
                
                <div class="email-time">${formatDate(date)}</div>
            </div>
        `;
        
        container.appendChild(emailElement);
    });
}


function formatDate(date) {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Fonction pour charger plus d'emails
async function loadMoreEmails() {
    if (isLoading || !nextPageToken) return;
    
    isLoading = true;
    const emails = await getEmails(nextPageToken);
    if (emails) {
        renderEmailList(emails, true); // true pour ajouter à la suite
    }
    isLoading = false;
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Chargement initial
    const emails = await getEmails();
    if (emails) {
        renderEmailList(emails);
    }

    // Détection du scroll pour charger plus d'emails
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            loadMoreEmails();
        }
    });
});

// Gestionnaire pour les onglets
document.querySelectorAll('.tab-inactive, .tab-active').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-inactive, .tab-active').forEach(t => {
            t.className = 'tab-inactive py-4 text-sm font-medium';
        });
        e.target.className = 'tab-active py-4 text-sm font-medium';
    });
});

// Ajoute ceci à la fin de ton addEventListener('DOMContentLoaded', ...)
document.querySelector('.fab').addEventListener('click', () => {
    // Ici tu peux ajouter la logique pour créer un nouveau mail
    console.log('Compose new email');
});
