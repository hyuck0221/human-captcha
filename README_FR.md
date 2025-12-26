<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

<p align="center">
  <img src="src/main/resources/image/logo.png" alt="H2H-CAPTCHA Logo" width="200" />
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **"Vérification en temps réel par des humains, pour des humains."**

H2H-CAPTCHA est une solution de sécurité innovante qui remplace les tests de Turing automatisés (comme identifier des feux de signalisation) par une interaction humaine en temps réel. Les utilisateurs ("Clients") sont associés à des vérificateurs humains ("Validateurs") pour effectuer des tâches interactives.

---

## 🏗 Architecture

Le système repose sur une architecture orientée événements utilisant **Spring Boot** et **WebSockets**.

### 1. Backend (Kotlin + Spring Boot)
-   **WebSocket (STOMP)** : Gère la communication bidirectionnelle en temps réel.
-   **Service de Mise en Relation (Matching)** :
    -   Gère des files d'attente séparées pour les Clients et les Validateurs.
    -   Réalise un appariement instantané 1:1.
    -   Gère le cycle de vie des sessions (connexion, déconnexion, expiration).
-   **Gestion en Mémoire** : Pour une vitesse et une confidentialité maximales, toutes les données sont traitées en mémoire (`ConcurrentHashMap`), sans persistance des données personnelles.

### 2. Frontend (Vanilla JS + HTML5)
-   **Miroir d'Écran** :
    -   Capture les coordonnées de la souris et la résolution d'écran du Client.
    -   Le tableau de bord du Validateur se redimensionne dynamiquement pour correspondre au ratio d'aspect du Client, assurant une observation fidèle.
-   **Canevas Interactif** :
    -   Système de double coordonnées : Envoie à la fois les coordonnées globales (relatives à l'écran) et locales (relatives au canevas) pour garantir la précision du dessin sur différents formats d'écran.

---

## 🎮 Défis Interactifs

Le système prend en charge quatre modes de vérification contrôlés par le Validateur :

1.  **🖱️ Suivi de Souris (Passif)**
    -   **Logique** : Le Validateur observe les mouvements naturels de la souris du Client.
    -   **Objectif** : Détecter les mouvements linéaires ou les téléportations instantanées typiques des bots.

2.  **✏️ Dessin (Actif)**
    -   **Logique** : Le Validateur assigne un sujet (ex: "Pomme"). Le Client le dessine sur un canevas.
    -   **Objectif** : Vérifier la créativité humaine et le contrôle moteur.

3.  **👊 Pierre-Feuille-Ciseaux (Réaction)**
    -   **Logique** : Le Validateur envoie un défi (ex: "Pierre"). Le Client doit choisir le coup gagnant ("Feuille").
    -   **Objectif** : Tester la compréhension des règles et la réponse cognitive.

4.  **💬 Chat (Turing)**
    -   **Logique** : Conversation textuelle libre. Inclut des indicateurs "En train de taper...".
    -   **Objectif** : Vérification finale par interaction linguistique avancée.

---

## 🚀 Commencer

### Prérequis
-   **Java 21** (ou Docker)
-   Port 8080 disponible

### Lancer avec Docker (Recommandé)
```bash
docker-compose up --build
```

### Lancer Manuellement
```bash
./gradlew bootRun
```

### Utilisation
1.  Ouvrez `http://localhost:8080`.
2.  **Onglet 1** : Sélectionnez **"Je suis un utilisateur (Client)"**.
3.  **Onglet 2** : Sélectionnez **"Je suis un validateur (Validator)"**.
4.  Le système vous mettra en relation instantanément.
5.  Utilisez la console du Validateur pour changer de tâche et vérifier le Client.

---

## 🛡️ Sécurité et Confidentialité
-   **Routage basé sur l'UUID** : Chaque session crée un UUID unique et éphémère. L'utilisation du `localStorage` permet de maintenir l'identité après rafraîchissement, assurant le bon fonctionnement de la liste noire du validateur.
-   **Isolation** : Les Clients ne peuvent pas communiquer entre eux.
-   **Confidentialité** : Pas de journalisation d'IP ni de stockage persistant. Les données n'existent que pendant la session WebSocket active.

---
© 2025 Projet Captcha H2H.
