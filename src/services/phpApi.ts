import { PHP_API_BASE_URL as ENV_PHP_API_BASE_URL } from '@env';

const trimSlashes = (value: string) => value.replace(/\/+$/, '');
const LEGACY_PHP_API_BASE_URL = 'https://arogyamantra.com/newApi';
const LEGACY_APP_API_BASE_URL = 'https://arogyamantra.com/app-api';
const LEGACY_PHP_ORIGIN_URL = 'https://arogyamantra.com';
const PHP_API_BASE_URLS = [
  trimSlashes(ENV_PHP_API_BASE_URL || ''),
  LEGACY_PHP_API_BASE_URL,
].filter((value, index, list) => value && list.indexOf(value) === index);

type AnyRecord = Record<string, any>;

export type PhpOfficeStatus = {
  officeOutApplied: boolean;
  officeOutApproved: boolean;
  officeInDone: boolean;
  rawStatus?: any;
};

const toFormBody = (payload: AnyRecord) => {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      body.append(key, String(value));
    }
  });

  return body.toString();
};

const unwrap = (data: any): AnyRecord => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const firstArrayItem = Array.isArray(data)
    ? data.find(item => item && typeof item === 'object')
    : null;
  if (firstArrayItem) {
    return unwrap(firstArrayItem);
  }

  const nestedSources = [
    data.data,
    data.result,
    data.product,
    data.account,
    data.accountData,
    data.accounts,
    data.accountDetails,
    data.account_details,
    data.userAccountDetails,
    data.user_account_details,
    data.bank,
    data.bankData,
    data.bankDetails,
    data.bank_details,
    data.salary,
    data.salaryData,
    data.salaryDetails,
    data.salary_details,
    data.profile,
    data.userProfile,
    data.user_profile,
    data.fallbackProfile,
    data.fallback_profile,
    data.details,
  ].filter(Boolean);
  const nested = nestedSources.reduce<AnyRecord>(
    (acc, source) => ({ ...acc, ...unwrap(source) }),
    {},
  );

  return {
    ...data,
    ...nested,
    ...(data.data && typeof data.data === 'object' ? data.data : {}),
    ...(data.user && typeof data.user === 'object' ? data.user : {}),
    ...(data.employee && typeof data.employee === 'object' ? data.employee : {}),
    ...(data.result && typeof data.result === 'object' ? data.result : {}),
    ...(data.product && typeof data.product === 'object' ? unwrap(data.product) : {}),
  };
};

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const readField = (source: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const direct = source[key];
    if (direct !== undefined && direct !== null && direct !== '') {
      return direct;
    }
  }

  const normalizedSource = Object.entries(source).reduce<AnyRecord>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const value = normalizedSource[normalizeKey(key)];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return '';
};

const normalizePhpImageUri = (value: any) => {
  const image = String(value || '').trim().replace(/\s/g, '');
  if (!image) {
    return '';
  }

  if (/^(https?:|data:image\/|file:)/i.test(image)) {
    return image;
  }

  if (image.startsWith('//')) {
    return `https:${image}`;
  }

  if (image.startsWith('/')) {
    return `${LEGACY_PHP_ORIGIN_URL}${image}`;
  }

  const looksLikeBase64Image =
    image.length > 120 &&
    !image.includes('.') &&
    /^[A-Za-z0-9+/]+=*$/.test(image);
  if (looksLikeBase64Image) {
    return `data:image/jpeg;base64,${image}`;
  }

  return `${LEGACY_PHP_API_BASE_URL}/${image.replace(/^\/+/, '')}`;
};

const collectObjects = (value: any, output: AnyRecord[] = []): AnyRecord[] => {
  if (!value || typeof value !== 'object') {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectObjects(item, output));
    return output;
  }

  output.push(value);
  Object.values(value).forEach(item => {
    if (item && typeof item === 'object') {
      collectObjects(item, output);
    }
  });
  return output;
};

const statusText = (value: any) => String(value ?? '').trim().toLowerCase();

const isApprovedOfficeValue = (value: any) => {
  const normalized = statusText(value);
  return (
    value === true ||
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'y' ||
    normalized === 'a' ||
    normalized === 'approved' ||
    normalized === 'approve' ||
    normalized === 'accepted' ||
    normalized.includes('approved')
  );
};

const isPendingOfficeValue = (value: any) => {
  const normalized = statusText(value);
  return (
    normalized === 'pending' ||
    normalized === 'p' ||
    normalized === 'requested' ||
    normalized === 'request' ||
    normalized === 'applied' ||
    normalized === 'waiting' ||
    normalized.includes('pending')
  );
};

const isRejectedOfficeValue = (value: any) => {
  const normalized = statusText(value);
  return (
    normalized === 'rejected' ||
    normalized === 'reject' ||
    normalized === 'declined' ||
    normalized === 'denied' ||
    normalized === 'r' ||
    normalized.includes('rejected')
  );
};

const isTruthyOfficeValue = (value: any) => {
  const normalized = statusText(value);
  return (
    value === true ||
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'y'
  );
};

export const normalizePhpOfficeStatus = (data: any): PhpOfficeStatus => {
  const flat = unwrap(data);
  const objects = [flat, ...collectObjects(data)].filter(Boolean);
  const readFromAny = (keys: string[]) => {
    for (const source of objects) {
      const value = readField(source, keys);
      if (value !== '') {
        return value;
      }
    }
    return '';
  };

  const statusValue = readFromAny([
    'officeOutStatus',
    'office_out_status',
    'officeout_status',
    'approvalStatus',
    'approval_status',
    'approvedStatus',
    'approved_status',
    'approveStatus',
    'approve_status',
    'hodStatus',
    'hod_status',
    'hodApproval',
    'hod_approval',
    'requestStatus',
    'request_status',
    'outStatus',
    'out_status',
  ]);
  const genericStatusValue = readFromAny(['status']);
  const effectiveStatus =
    statusValue ||
    (['pending', 'approved', 'approve', 'accepted', 'rejected', 'declined', 'applied', 'requested'].some(
      status => statusText(genericStatusValue).includes(status),
    )
      ? genericStatusValue
      : '');

  const approvedValue = readFromAny([
    'officeOutApproved',
    'office_out_approved',
    'officeout_approved',
    'officeOutApproval',
    'office_out_approval',
    'approved',
    'isApproved',
    'is_approved',
    'approval',
    'approve',
    'hodApproved',
    'hod_approved',
    'hodApproval',
    'hod_approval',
  ]);
  const appliedValue = readFromAny([
    'officeOutApplied',
    'office_out_applied',
    'officeout_applied',
    'officeOutRequested',
    'office_out_requested',
    'requestApplied',
    'request_applied',
    'applied',
    'requested',
  ]);
  const officeInValue = readFromAny([
    'officeInDone',
    'office_in_done',
    'officein_done',
    'officeIn',
    'office_in',
    'inDone',
    'in_done',
  ]);
  const officeInTime = readFromAny([
    'inTime',
    'in_time',
    'intime',
    'officeInTime',
    'office_in_time',
    'officeintime',
  ]);
  const officeOutTime = readFromAny([
    'outTime',
    'out_time',
    'outtime',
    'officeOutTime',
    'office_out_time',
    'officeouttime',
  ]);
  const requestId = readFromAny([
    'officeOutId',
    'office_out_id',
    'requestId',
    'request_id',
    'outin_id',
    'id',
  ]);

  const officeInDone = isTruthyOfficeValue(officeInValue) || Boolean(officeInTime);
  const officeOutApproved =
    !isRejectedOfficeValue(effectiveStatus) &&
    (isApprovedOfficeValue(approvedValue) || isApprovedOfficeValue(effectiveStatus));
  const officeOutApplied =
    !isRejectedOfficeValue(effectiveStatus) &&
    (officeOutApproved ||
      isTruthyOfficeValue(appliedValue) ||
      isPendingOfficeValue(effectiveStatus) ||
      Boolean(officeOutTime || requestId));

  return {
    officeOutApplied,
    officeOutApproved,
    officeInDone,
    rawStatus: effectiveStatus || approvedValue || appliedValue,
  };
};

export const isPhpSuccess = (data: any) => {
  const value = String(data?.result ?? data?.status ?? data?.success ?? '')
    .trim()
    .toLowerCase();

  return (
    value === 'true' ||
    value === 'success' ||
    value === '1' ||
    data?.success === true ||
    data?.status === true ||
    data?.result === true ||
    Boolean(
      data?.otp ||
        data?.token ||
        data?.auth_token ||
        data?.access_token ||
        data?.userId ||
        data?.user_id ||
        data?.employee ||
        data?.user ||
        data?.data,
    )
  );
};

const isPhpFailure = (data: any) => {
  const value = String(data?.result ?? data?.status ?? data?.success ?? '')
    .trim()
    .toLowerCase();

  return (
    value === 'false' ||
    value === 'error' ||
    value === 'failed' ||
    value === '0' ||
    data?.success === false ||
    data?.status === false ||
    data?.result === false ||
    data?.error === true
  );
};

const requestPhpApi = async (
  endpoint: string,
  payload: AnyRecord = {},
  method: 'GET' | 'POST' = 'POST',
  baseUrls: string[] = PHP_API_BASE_URLS,
) => {
  const formBody = toFormBody(payload);
  let lastError: unknown = null;
  const shouldLogOfficeDebug =
    endpoint === 'officeout.php' ||
    endpoint === 'officein.php' ||
    endpoint.includes('office-status') ||
    endpoint.includes('officeout-status') ||
    endpoint.includes('officeoutStatus') ||
    endpoint.includes('officeOutStatus');

  if (shouldLogOfficeDebug) {
    const safePayload = {
      ...payload,
      token: payload.token ? `${String(payload.token).slice(0, 6)}...` : payload.token,
    };
    console.log('[PHP API REQUEST]', endpoint, JSON.stringify({
      method,
      payloadKeys: Object.keys(payload),
      payload: safePayload,
      formBody: toFormBody(safePayload),
    }, null, 2));
  }

  for (const baseUrl of baseUrls) {
    try {
      const url =
        method === 'GET' && formBody
          ? `${baseUrl}/${endpoint}?${formBody}`
          : `${baseUrl}/${endpoint}`;
      const response = await fetch(url, {
        method,
        ...(method === 'POST'
          ? {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formBody,
            }
          : {}),
      });

      const rawText = await response.text();
      let data: AnyRecord = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error('Invalid API response');
      }
      if (!response.ok || isPhpFailure(data)) {
        throw new Error(data?.message || data?.msg || 'API request failed');
      }

      if (shouldLogOfficeDebug) {
        console.log('[PHP API RESPONSE]', endpoint, JSON.stringify(data, null, 2));
      }

      return data;
    } catch (error) {
      lastError = error;
      console.warn(`PHP API request failed for ${baseUrl}/${endpoint}:`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('API request failed');
};

const requestFirstAvailablePhpApi = async (
  endpoints: string[],
  payload: AnyRecord = {},
  method: 'GET' | 'POST' = 'POST',
) => {
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      return await requestPhpApi(endpoint, payload, method);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('API request failed');
};

export const requestPhpLogin = (empCode: string, mobile: string) =>
  requestPhpApi('login.php', {
    empCode,
    emp_code: empCode,
    employee_code: empCode,
    mobile,
    phone: mobile,
  });

export const verifyPhpOtp = ({
  userId,
  empCode,
  mobile,
  otp,
}: {
  userId?: string;
  empCode?: string;
  mobile: string;
  otp: string;
}) =>
  requestPhpApi('verify-otp.php', {
    userId,
    user_id: userId,
    id: userId,
    empCode,
    emp_code: empCode,
    employee_code: empCode,
    mobile,
    phone: mobile,
    otp,
  });

export const fetchPhpUserProfile = ({
  token,
  getMonth,
}: {
  token?: string | null;
  getMonth?: string | null;
}) => {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) {
    throw new Error('Token required');
  }

  const payload = {
    token: cleanToken,
    getMonth,
  };

  return requestPhpApi('user-profile.php', payload, 'GET')
    .then(async (profileData) => {
      try {
        const fallbackProfile = await requestPhpApi('fetch-profile.php', payload, 'POST');
        return {
          ...fallbackProfile,
          ...profileData,
          fallbackProfile,
        };
      } catch {
        return profileData;
      }
    })
    .catch(() => requestPhpApi('fetch-profile.php', payload, 'POST'));
};

export const fetchPhpUserAccountDetails = ({
  token,
  monthYear,
}: {
  token: string;
  monthYear: string;
}) => {
  const payload = {
    token,
    monthYear,
  };

  return requestPhpApi('user-account-details.php', payload, 'POST', [LEGACY_PHP_API_BASE_URL])
    .catch(() => requestPhpApi('user-account-details.php', payload, 'GET', [LEGACY_APP_API_BASE_URL]));
};

export const markPhpAttendanceIn = ({
  token,
  mobile,
  userId,
  empCode,
  deviceId,
  address,
  atdIntime,
  latitude,
  longitude,
}: {
  token: string;
  mobile?: string | null;
  userId?: string | null;
  empCode?: string | null;
  deviceId?: string | null;
  address: string;
  atdIntime: string;
  latitude: string;
  longitude: string;
}) =>
  requestPhpApi('atd_intime.php', {
    token,
    mobile,
    userId: userId || token,
    user_id: userId || token,
    id: userId || '',
    empCode,
    emp_code: empCode,
    employee_code: empCode,
    deviceId,
    device_id: deviceId,
    atdInTiImage: address,
    atd_intime_image: address,
    atd_address: address,
    address,
    atdIntime,
    atd_intime: atdIntime,
    intime: atdIntime,
    atdInLatitude: latitude,
    atd_in_latitude: latitude,
    latitude,
    lat: latitude,
    atdInLongitude: longitude,
    atd_in_longitude: longitude,
    longitude,
    long: longitude,
    atdFinalStatus: 'IN',
    atd_final_status: 'IN',
  });

export const markPhpAttendanceOut = ({
  token,
  atdrId,
  address,
  latitude,
  longitude,
}: {
  token: string;
  atdrId?: string | null;
  address: string;
  latitude: string;
  longitude: string;
}) =>
  requestPhpApi('atd_outtime.php', {
    token,
    atdrId,
    atd_id: atdrId,
    attendance_id: atdrId,
    atdOuttime: new Date().toISOString(),
    atd_outtime: new Date().toISOString(),
    outtime: new Date().toISOString(),
    atdOutTiImage: address,
    atd_outtime_image: address,
    atd_out_address: address,
    address,
    atdOutLatitude: latitude,
    atd_out_latitude: latitude,
    latitude,
    lat: latitude,
    atdOutLongitude: longitude,
    atd_out_longitude: longitude,
    longitude,
    long: longitude,
  });

export const fetchPhpAttendanceSummary = ({
  token,
  getMonth,
}: {
  token: string;
  getMonth: string;
}) =>
  requestPhpApi(
    'attendance_summary.php',
    {
      token,
      getMonth,
    },
    'GET',
  );

export const requestPhpPaidLeave = ({
  token,
  userId,
  empCode,
  leaveDate,
  reason,
  address,
}: {
  token: string;
  userId?: string | null;
  empCode?: string | null;
  leaveDate: string;
  reason: string;
  address: string;
}) =>
  requestPhpApi('request-Pl.php', {
    token,
    id: userId,
    empCode,
    leave_date: leaveDate,
    reason,
    address,
    location: address,
  });

export const fetchPhpPaidLeaveCount = ({token}: {token: string}) =>
  requestPhpApi(
    'paidLeaveCount.php',
    {
      token,
    },
    'GET',
  );

export const requestPhpCreateTodo = ({
  token,
  deadline,
  description,
  assignTo,
}: {
  token: string;
  deadline: string;
  description: string;
  assignTo: string;
}) =>
  requestPhpApi('create-todo.php', {
    token,
    deadline,
    description,
    assign_to: assignTo,
  });

export const fetchPhpTodoList = ({token}: {token: string}) =>
  requestPhpApi(
    'todo-list.php',
    {
      token,
    },
    'POST',
  );

export const fetchPhpTodoCheckoutDisable = ({token}: {token: string}) =>
  requestPhpApi(
    'todoCheckoutDisable.php',
    {
      token,
    },
    'POST',
  );

export const fetchPhpHolidayList = ({token}: {token: string}) =>
  requestPhpApi(
    'holiday-list.php',
    {
      token,
    },
    'GET',
  );

export const requestPhpOfficeOut = ({
  token,
  msgTxt,
  workType,
  outTime,
  location,
}: {
  token: string;
  msgTxt: string;
  workType: string;
  outTime: string;
  location: string;
}) =>
  requestPhpApi('officeout.php', {
    token,
    msg_txt: msgTxt,
    workType,
    out_time: outTime,
    location,
  });

export const requestPhpOfficeIn = ({
  token,
}: {
  token: string;
}) =>
  requestPhpApi('officein.php', {
    token,
  });

const officeStatusHasSignal = (status: PhpOfficeStatus) =>
  status.officeOutApplied ||
  status.officeOutApproved ||
  status.officeInDone ||
  Boolean(status.rawStatus);

export const fetchPhpOfficeStatus = ({
  token,
}: {
  token: string;
}) => {
  const endpoints = [
    'officeoutStatus.php',
    'office-status.php',
    'officeout-status.php',
    'officeOutStatus.php',
  ];
  const methods: Array<'GET' | 'POST'> = ['GET', 'POST'];

  return (async () => {
    let firstSuccess: AnyRecord | null = null;
    let firstMeaningful: AnyRecord | null = null;
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      for (const method of methods) {
        try {
          const data = await requestPhpApi(endpoint, {token}, method);
          const normalized = normalizePhpOfficeStatus(data);
          console.log('[PHP OFFICE STATUS CANDIDATE]', endpoint, method, JSON.stringify({
            normalized,
            data,
          }, null, 2));

          if (!firstSuccess) {
            firstSuccess = data;
          }
          if (!firstMeaningful && officeStatusHasSignal(normalized)) {
            firstMeaningful = data;
          }
          if (normalized.officeOutApplied && normalized.officeOutApproved && !normalized.officeInDone) {
            return data;
          }
        } catch (error) {
          lastError = error;
        }
      }
    }

    if (firstMeaningful) {
      return firstMeaningful;
    }
    if (firstSuccess) {
      return firstSuccess;
    }

    throw lastError instanceof Error ? lastError : new Error('Office status API request failed');
  })();
};

export const requestPhpUrgentLeave = ({
  token,
  leaveType,
  reason,
  lat,
  longt,
}: {
  token: string;
  leaveType: string;
  reason: string;
  lat: string;
  longt: string;
}) =>
  requestPhpApi(
    'urgent-leave.php',
    {
      token,
      leave_type: leaveType,
      reason,
      lat,
      longt,
    },
    'POST',
    [LEGACY_PHP_API_BASE_URL],
  );

export const requestPhpCasualLeave = ({
  token,
  startDate,
  reasonOfLeave,
  responsibleEmpId,
  empName,
  responsibleDesignation,
}: {
  token: string;
  startDate: string;
  reasonOfLeave: string;
  responsibleEmpId?: string;
  empName?: string;
  responsibleDesignation?: string;
}) =>
  requestPhpApi(
    'save-casual-leave.php',
    {
      token,
      start_date: startDate,
      reasonOfLeave,
      responsible_emp_id: responsibleEmpId,
      responsible_employee_id: responsibleEmpId,
      responsible_empId: responsibleEmpId,
      emp_id: responsibleEmpId,
      empId: responsibleEmpId,
      employee_id: responsibleEmpId,
      employeeId: responsibleEmpId,
      emp_name: responsibleEmpId,
      responsible_employee: empName,
      responsible_designation: responsibleDesignation,
      designation: responsibleDesignation,
    },
    'POST',
    [LEGACY_PHP_API_BASE_URL],
  );

export const fetchPhpEmployeeList = ({token}: {token: string}) =>
  requestPhpApi(
    'employee-list.php',
    {
      token,
    },
    'POST',
    [LEGACY_PHP_API_BASE_URL],
  );

export const normalizePhpEmployeeList = (data: any) => {
  const items =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.employees)
            ? data.employees
            : [];

  return items
    .map((item: any) => {
      const source = unwrap(item);
      const fullName =
        readField(source, ['name', 'employeeName', 'empName', 'full_name', 'fullName']) ||
        `${readField(source, ['emp_firstName', 'firstName', 'firstname', 'first_name'])} ${readField(source, ['emp_lastName', 'lastName', 'lastname', 'last_name'])}`.trim();

      return {
        id: String(readField(source, ['id', '_id', 'emp_id', 'empId', 'employeeId', 'employeeID', 'employee_id', 'userId', 'user_id', 'emp_uid', 'empCode', 'emp_code']) || fullName),
        name: String(fullName || ''),
        designation: String(readField(source, ['designation', 'designationName', 'desg_name', 'desgName', 'role']) || ''),
      };
    })
    .filter((item: {name: string}) => item.name);
};

export const updatePhpTodoStatus = ({
  token,
  todoId,
  status,
}: {
  token: string;
  todoId: string;
  status: string;
}) =>
  requestFirstAvailablePhpApi(
    [
      'update-todo-status.php',
      'todo-status.php',
      'updateTodoStatus.php',
      'todoStatusUpdate.php',
      'todo-status-update.php',
      'updateTodo.php',
      'todo-update.php',
    ],
    {
      token,
      todo_id: todoId,
      todoId,
      td_id: todoId,
      task_id: todoId,
      id: todoId,
      status,
      currentStatus: status,
      current_status: status,
      todo_status: status,
    },
  );

export const replyPhpTodo = ({
  token,
  todoId,
  reply,
}: {
  token: string;
  todoId: string;
  reply: string;
}) =>
  requestFirstAvailablePhpApi(
    ['todo_reply.php', 'todo-reply.php', 'reply-todo.php', 'todoReply.php'],
    {
      token,
      tid: todoId,
      todo_id: todoId,
      id: todoId,
      reply,
      message: reply,
    },
  );

export const normalizePhpAuth = (data: any, fallback: AnyRecord = {}) => {
  const source = unwrap(data);
  const fullName =
    source.name ||
    source.fullName ||
    source.full_name ||
    source.empName ||
    source.employee_name ||
    '';
  const [firstname = '', ...restName] = String(fullName).trim().split(/\s+/);

  return {
    token: String(source.token || source.auth_token || source.access_token || fallback.token || ''),
    userId: String(source.userId || source.user_id || source.id || fallback.userId || ''),
    empCode: String(
      source.empCode ||
        source.emp_code ||
        source.employee_code ||
        source.employeeId ||
        source.emp_uid ||
        fallback.empCode ||
        '',
    ),
    mobile: String(source.mobile || source.phone || source.emp_mobile || fallback.mobile || ''),
    firstname: String(source.firstname || source.firstName || source.emp_firstName || firstname || ''),
    lastname: String(source.lastname || source.lastName || source.emp_lastName || restName.join(' ') || ''),
    role: String(source.role || source.user_role || source.crewcamRole || fallback.role || 'employee'),
  };
};

export const normalizePhpProfileForApp = (data: any) => {
  const source = unwrap(data);
  const firstName =
    source.emp_firstName ||
    source.emp_firstname ||
    source.empFirstName ||
    source.firstName ||
    source.firstname ||
    source.first_name ||
    source.fname ||
    source.name ||
    '';
  const lastName =
    source.emp_lastName ||
    source.emp_lastname ||
    source.empLastName ||
    source.lastName ||
    source.lastname ||
    source.last_name ||
    source.lname ||
    '';

  const employee = {
    emp_firstName: firstName,
    emp_lastName: lastName,
    emp_uid:
      source.emp_uid ||
      source.empUid ||
      source.empCode ||
      source.emp_code ||
      source.employee_code ||
      source.employeeId ||
      source.employee_id ||
      source.user_id ||
      source.userId ||
      '',
    desg_name: source.desg_name || source.designation || source.designation_name || source.desg || source.grade || '',
    dept_name: source.dept_name || source.department || source.department_name || source.dept || '',
    emp_off_mob: source.emp_off_mob || source.office_mobile || source.office_phone || source.emp_off_mobile || source.official_mobile || '',
    emp_off_email: source.emp_off_email || source.office_email || source.official_email || source.email || '',
    reporting_person: source.reporting_person || {
      title: source.reporting_title || '',
      firstname: source.reporting_firstname || source.reporting_name || '',
      lastname: source.reporting_lastname || '',
      contact_no: source.reporting_contact || source.reporting_mobile || '',
    },
    company_address:
      source.company_address || source.job_reporting_address || source.office_address || '',
    emp_dojoin: source.emp_dojoin || source.joining_date || source.date_of_joining || '',
    emp_mobile: source.emp_mobile || source.mobile || source.phone || '',
    emp_residenceno: source.emp_residenceno || source.residence_no || '',
  };

  const address = {
    permanent_addr: source.permanent_addr || source.address || source.residence_address || '',
    permanent_city: source.permanent_city || source.city || '',
    state: source.state || '',
    country: source.country || '',
  };

  const emergency = {
    emperson_Name: source.emperson_Name || source.emergency_name || source.emergency_contact_name || '',
    emrelation: source.emrelation || source.emergency_relation || '',
    empm_no: source.empm_no || source.emergency_mobile || source.emergency_phone || '',
    emalt_no: source.emalt_no || source.emergency_alt_mobile || '',
    emEmailid: source.emEmailid || source.emergency_email || '',
    empaddress: source.empaddress || source.emergency_address || '',
    city: source.emergency_city || source.city || '',
    state: source.emergency_state || source.state || '',
    country: source.emergency_country || source.country || '',
  };

  const account = {
    acc_no: readField(source, [
      'acc_no',
      'accNo',
      'account_no',
      'accountNo',
      'account_number',
      'accountNumber',
      'bank_account',
      'bank_account_no',
      'bankAccountNo',
      'bank_account_number',
      'bankAccountNumber',
      'salary_account_no',
      'salaryAccountNo',
      'salary_bank_account_no',
      'salaryBankAccountNo',
      'salary bank account no',
      'salary bank account number',
      'bank a/c no',
      'bank ac no',
      'bank account no',
      'sal_acc_no',
    ]),
    ifsc_code: readField(source, [
      'ifsc_code',
      'ifscCode',
      'ifsc',
      'bank_ifsc',
      'bankIfsc',
      'bank_ifsc_code',
      'bankIfscCode',
      'salary_ifsc',
      'salaryIfsc',
      'salary_ifsc_code',
      'salaryIfscCode',
      'salary ifsc code',
      'ifsc code',
      'sal_ifsc',
    ]),
    pacno: readField(source, [
      'pacno',
      'pac_no',
      'personal_account_no',
      'personalAccountNo',
      'personal_bank_account_no',
      'personalBankAccountNo',
      'personal_account_number',
      'personalAccountNumber',
      'personal bank account no',
      'personal bank account number',
    ]),
    pifsc: readField(source, [
      'pifsc',
      'p_ifsc',
      'personal_ifsc',
      'personalIfsc',
      'personal_bank_ifsc',
      'personalBankIfsc',
      'personal_ifsc_code',
      'personalIfscCode',
      'personal ifsc code',
    ]),
    ppaytmno: readField(source, [
      'ppaytmno',
      'paytm_no',
      'paytmNo',
      'paytm',
      'paytm_number',
      'paytmNumber',
      'paytm no',
      'paytm number',
    ]),
    aadhar_card: readField(source, [
      'aadhar_card',
      'aadhaar_card',
      'aadhaar',
      'aadhar',
      'aadhaar_no',
      'aadhar_no',
      'aadhaarNo',
      'aadharNo',
      'aadhar card no',
      'aadhaar card no',
    ]),
    pan_card: readField(source, [
      'pan_card',
      'panCard',
      'pan',
      'pan_no',
      'panNo',
      'pan card no',
    ]),
    ESI_no: readField(source, [
      'ESI_no',
      'esi_no',
      'esiNo',
      'esic_no',
      'esicNo',
      'esic no',
      'esi no',
    ]),
    UAN_no: readField(source, [
      'UAN_no',
      'uan_no',
      'uanNo',
      'epf_no',
      'epfNo',
      'pf_no',
      'pfNo',
      'epf no',
      'uan no',
    ]),
  };

  const profilePic = readField(source, [
    'profile_pic',
    'profilePic',
    'profile_image',
    'profileImage',
    'employeeImage',
    'employee_image',
    'emp_image',
    'emp_photo',
    'emp_pic',
    'user_image',
    'userImage',
    'image_url',
    'imageUrl',
    'photo',
    'pic',
    'image',
  ]);

  return {
    employee: {
      ...(data?.employee && typeof data.employee === 'object' ? data.employee : {}),
      ...employee,
    },
    address: {
      ...(data?.address && typeof data.address === 'object' ? data.address : {}),
      ...address,
    },
    emergency: {
      ...(data?.emergency && typeof data.emergency === 'object' ? data.emergency : {}),
      ...emergency,
    },
    account,
    profilePic: normalizePhpImageUri(profilePic),
  };
};

export const normalizePhpSalaryForApp = (data: any) => {
  const source = unwrap(data);
  const account = normalizePhpProfileForApp(data).account || {};

  return {
    ...source,
    ...account,
    ctc_month: readField(source, ['ctc_month', 'monthly_ctc', 'monthlyCtc', 'monthly ctc']),
    gross_salary: readField(source, ['gross_salary', 'grossSalary', 'gross salary']),
    pf_contribution: readField(source, [
      'pf_contribution',
      'pfcontribute',
      'pfContribution',
      'pf contribution',
    ]),
    esi_contribution: readField(source, [
      'esi_contribution',
      'esicontribution',
      'esiContribution',
      'esi contribution',
    ]),
    otsalary: readField(source, ['otsalary', 'ot_salary', 'otSalary', 'ot salary']),
    incentive: readField(source, ['incentive', 'incentive_amt', 'incentiveAmount']),
    net_salary: readField(source, [
      'net_salary',
      'netPayableSalary',
      'net_payable_salary',
      'net payable salary',
    ]),
    advance_less: readField(source, [
      'advance_less',
      'advanceLess',
      'advance_salary',
      'advance sal deduction',
    ]),
    tds_deduction: readField(source, ['tds_deduction', 'tdsDeduction', 'tds deduction']),
    loan_installment: readField(source, [
      'loan_installment',
      'loanInstallment',
      'loan installment',
    ]),
    expense_received: readField(source, [
      'expense_received',
      'expenseReceived',
      'expense received',
    ]),
    penalty_deduction: readField(source, [
      'penalty_deduction',
      'penaltyDeduction',
      'penalty deduction',
    ]),
    next_month_loan_balance: readField(source, [
      'next_month_loan_balance',
      'loan_balance',
      'loanBalance',
      'loan balance',
    ]),
  };
};
