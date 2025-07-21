(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()


//Password toggler button
document.addEventListener('DOMContentLoaded', () => {
  const toggleIcons = document.querySelectorAll('.toggle-password');

  toggleIcons.forEach(icon => {
    const input = icon.previousElementSibling;

    // Show icon on focus
    input.addEventListener('focus', () => {
      icon.style.display = 'block';
    });

    // Hide icon if input is empty on blur
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        icon.style.display = 'none';
        input.type = 'password'; // Reset input to hidden
        icon.classList.add('fa-eye-slash');
        icon.classList.remove('fa-eye');
      }
    });

    // Toggle password visibility on icon click
    icon.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent input blur on click
    });

    icon.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.classList.toggle('fa-eye-slash', !isHidden);
      icon.classList.toggle('fa-eye', isHidden);
    });
  });
});