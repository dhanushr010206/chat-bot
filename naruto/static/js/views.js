document.addEventListener('DOMContentLoaded', () => {
    const switchers = document.querySelectorAll('.view-switcher');
    const panels = document.querySelectorAll('.view-panel');

    switchers.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons and panels
            switchers.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active to clicked button and target panel
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            // On mobile, close sidebar when clicking a link
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });

    // Sidebar Toggle
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');

    if(openBtn) {
        openBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
});
