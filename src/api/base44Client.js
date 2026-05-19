import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

const PLATFORM_OWNER_EMAILS = new Set([
  'mmylvaganam@premierhealthcanada.ca',
  'mylvaganam@premierhealthcanada.ca',
]);

const SYNTHETIC_OWNER_ROLES = [
  {
    id: '__platform_owner_role__',
    code: 'PLATFORM_OWNER',
    role_name: 'PLATFORM_OWNER',
    name: 'Platform Owner',
    description: 'Full platform owner access',
  },
  {
    id: '__app_admin_role__',
    code: 'APP_ADMIN',
    role_name: 'APP_ADMIN',
    name: 'App Admin',
    description: 'Application administration access',
  },
  {
    id: '__org_super_user_role__',
    code: 'ORG_SUPER_USER',
    role_name: 'ORG_SUPER_USER',
    name: 'Organization Super User',
    description: 'Full organization administration access',
  },
];

let currentOwnerUser = null;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

function isPlatformOwnerEmail(email) {
  return PLATFORM_OWNER_EMAILS.has(normalizeEmail(email));
}

function normalizePlatformOwnerUser(user) {
  if (!user || !isPlatformOwnerEmail(user.email)) {
    return user;
  }

  const normalizedUser = {
    ...user,
    role: 'admin',
    is_admin: true,
    is_platform_owner: true,
    platform_owner: true,
    permissions_unrestricted: true,
  };

  currentOwnerUser = normalizedUser;
  return normalizedUser;
}

function syntheticUserRolesForOwner(user) {
  if (!user || !isPlatformOwnerEmail(user.email)) {
    return [];
  }

  return SYNTHETIC_OWNER_ROLES.map((role) => ({
    id: `__${role.code.toLowerCase()}_assignment__`,
    user_id: user.id,
    user_email: user.email,
    role_id: role.id,
    role_code: role.code,
    organization_id: '',
    created_by: user.email,
    created_by_email: user.email,
  }));
}

function mergeById(records, additions) {
  const merged = [...(Array.isArray(records) ? records : [])];
  const ids = new Set(merged.map((record) => record?.id).filter(Boolean));

  additions.forEach((addition) => {
    if (!ids.has(addition.id)) {
      merged.push(addition);
    }
  });

  return merged;
}

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false
});

const originalAuthMe = base44.auth.me.bind(base44.auth);

base44.auth.me = async (...args) => {
  const user = await originalAuthMe(...args);
  return normalizePlatformOwnerUser(user);
};

if (base44.entities?.Role?.list) {
  const originalRoleList = base44.entities.Role.list.bind(base44.entities.Role);

  base44.entities.Role.list = async (...args) => {
    const roles = await originalRoleList(...args);
    return currentOwnerUser
      ? mergeById(roles, SYNTHETIC_OWNER_ROLES)
      : roles;
  };
}

if (base44.entities?.Role?.filter) {
  const originalRoleFilter = base44.entities.Role.filter.bind(base44.entities.Role);

  base44.entities.Role.filter = async (...args) => {
    const roles = await originalRoleFilter(...args);
    return currentOwnerUser
      ? mergeById(roles, SYNTHETIC_OWNER_ROLES)
      : roles;
  };
}

if (base44.entities?.UserRole?.list) {
  const originalUserRoleList = base44.entities.UserRole.list.bind(base44.entities.UserRole);

  base44.entities.UserRole.list = async (...args) => {
    const userRoles = await originalUserRoleList(...args);
    return currentOwnerUser
      ? mergeById(userRoles, syntheticUserRolesForOwner(currentOwnerUser))
      : userRoles;
  };
}

if (base44.entities?.UserRole?.filter) {
  const originalUserRoleFilter = base44.entities.UserRole.filter.bind(base44.entities.UserRole);

  base44.entities.UserRole.filter = async (criteria = {}, ...args) => {
    const userRoles = await originalUserRoleFilter(criteria, ...args);
    const syntheticRoles = syntheticUserRolesForOwner(currentOwnerUser);

    if (!syntheticRoles.length) {
      return userRoles;
    }

    const matchesCurrentOwner =
      !criteria?.user_id ||
      criteria.user_id === currentOwnerUser?.id ||
      criteria.user_email === currentOwnerUser?.email;

    return matchesCurrentOwner
      ? mergeById(userRoles, syntheticRoles)
      : userRoles;
  };
}
