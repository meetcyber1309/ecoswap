async function loadItems() {
    const container = document.getElementById("itemsContainer");

    if (!container) return;

    const response = await fetch("http://localhost:5000/api/items/all");
    const items = await response.json();

    container.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-card";

        div.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <p><strong>Category:</strong> ${item.category}</p>
            <p><strong>Exchange For:</strong> ${item.exchangeFor}</p>
            <p><strong>Owner:</strong> ${item.owner?.name || 'Unknown'}</p>
        `;

        container.appendChild(div);
    });
}

loadItems();